// @flow
import { Type } from "./type";
import { unique } from "../../utils/common";
import { UnionType } from "./union-type";
import { FunctionType } from "./function-type";
import { VariableInfo } from "../variable-info";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import { CALLABLE, INDEXABLE, CONSTRUCTABLE } from "../constants";
import type { Scope } from "../scope";
import type { TypeMeta } from "./type";
import type { ClassProperty, ObjectProperty, ClassMethod, ObjectMethod } from "@babel/core";

type ExtendedTypeMeta = { ...TypeMeta, isNominal?: boolean };

export class ObjectType extends Type {
  static createTypeWithName = createTypeWithName(ObjectType);

  static getName(params: Array<[string | number, any]>, type?: ObjectType) {
    if (type !== undefined && String(type.name)[0] !== "{") {
      return undefined;
    }
    const filteredProperties = params ? unique(params, ([key]) => key) : [];
    return `{ ${filteredProperties
      .sort(([name1], [name2]) => String(name1).localeCompare(String(name2)))
      .map(
        ([name, type]) =>
          `${name}: ${getNameForType(
            type instanceof VariableInfo ? type.type : type
          )}`
      )
      .join(", ")} }`;
  }

  isNominal: boolean;
  properties: Map<string | number, VariableInfo>;
  onlyLiteral = true;

  constructor(
    name: ?string,
    properties: Array<[string | number, VariableInfo]>,
    options: ExtendedTypeMeta = {}
  ) {
    super(name, {
      isSubtypeOf: name === "Object" ? undefined : new ObjectType("Object", []),
      ...options
    });
    this.isNominal = Boolean(options.isNominal);
    const filteredProperties = properties
      ? unique(properties, ([key]) => key)
      : [];
    this.properties = new Map(filteredProperties);
  }

  getPropertyType(propertyName: mixed): ?Type | ClassProperty | ObjectProperty | ClassMethod | ObjectMethod {
    let fieldOwner = this;
    let field = null;
    while (fieldOwner) {
      // $FlowIssue
      field = fieldOwner.properties.get(propertyName);
      if (
        field ||
        !(
          fieldOwner.isSubtypeOf && fieldOwner.isSubtypeOf instanceof ObjectType
        )
      ) {
        break;
      }
      fieldOwner = fieldOwner.isSubtypeOf;
    }
    if (!field) {
      return null;
    }
    return field.type instanceof Type ? field.type : field;
  }

  isAllProperties(
    predicate: "equalsTo" | "isPrincipalTypeFor",
    anotherType: ObjectType
  ): boolean {
    for (const [key, { type }] of this.properties) {
      if ([CALLABLE, INDEXABLE, CONSTRUCTABLE].includes(key)) {
        continue;
      }
      const anotherProperty = anotherType.properties.get(key) || {
        type: new Type("undefined")
      };
      /* $FlowIssue - flow doesn't type methods by name */
      if (!type[predicate](anotherProperty.type)) {
        return false;
      }
    }
    return true;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ): Type {
    let isAnyPropertyChanged = false;
    const newProperties: Array<[string | number, VariableInfo]> = [];
    this.properties.forEach((vInfo, key) => {
      const newType = vInfo.type.changeAll(sourceTypes, targetTypes, typeScope);
      if (vInfo.type === newType) {
        return newProperties.push([key, vInfo]);
      }
      isAnyPropertyChanged = true;
      newProperties.push([
        key,
        new VariableInfo(newType, vInfo.parent, vInfo.meta)
      ]);
    });
    const isSubtypeOf =
      this.isSubtypeOf &&
      this.isSubtypeOf.changeAll(sourceTypes, targetTypes, typeScope);
    if (!isAnyPropertyChanged && this.isSubtypeOf === isSubtypeOf) {
      return this;
    }
    return new ObjectType(
      ObjectType.getName(newProperties, this) ||
        this.getChangedName(sourceTypes, targetTypes),
      newProperties,
      {
        isSubtypeOf
      }
    );
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }
    if (
      !(anotherType instanceof ObjectType) ||
      anotherType.properties.size !== this.properties.size ||
      !super.equalsTo(anotherType)
    ) {
      return false;
    }
    return this.isAllProperties("equalsTo", anotherType);
  }

  isSuperTypeFor(anotherType: Type): boolean {
    anotherType = this.getOponentType(anotherType);
    const requiredProperties = [...this.properties.values()].filter(
      ({ type }) =>
        !(type instanceof UnionType) ||
        !type.variants.some(t =>
          t.equalsTo(new Type("undefined", { isSubtypeOf: new Type("void") }))
        )
    );
    return anotherType instanceof ObjectType && !this.isNominal
      ? anotherType.properties.size >= requiredProperties.length &&
          this.isAllProperties("isPrincipalTypeFor", anotherType)
      : anotherType.isSubtypeOf != undefined &&
          this.isPrincipalTypeFor(anotherType.isSubtypeOf);
  }

  getDifference(type: Type) {
    if (type instanceof ObjectType) {
      let differences = [];
      const { properties } = type;
      this.properties.forEach(({ type }, key) => {
        const other = properties.get(key);
        if (other === undefined) {
          return;
        }
        differences = differences.concat(type.getDifference(other.type));
      });
      return differences;
    }
    if (type instanceof FunctionType) {
      const callable = this.properties.get(CALLABLE); 
      if (callable !== undefined) {
        return callable.type.getDifference(type);
      }
    }
    return super.getDifference(type);
  }

  contains(type: Type) {
    if (super.contains(type)) {
      return true;
    }
    for (const [_, property] of this.properties) {
      if (property.type.contains(type)) {
        return true;
      }
    }
    return false;
  }

  weakContains(type: Type) {
    return super.contains(type) || this.equalsTo(type);
  }
}
