// @flow
import { Type } from "./type";
import { unique } from "../../utils/common";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { FunctionType } from "./function-type";
import { VariableInfo } from "../variable-info";
import { CALLABLE, INDEXABLE, CONSTRUCTABLE } from "../constants";
import type { TypeMeta } from "./type";
import type { TypeScope } from "../type-scope";
import type {
  ClassProperty,
  ObjectProperty,
  ClassMethod,
  ObjectMethod
} from "@babel/core";

type ExtendedTypeMeta = { ...TypeMeta, isNominal?: boolean };

export class ObjectType extends Type {
  static Object = new TypeVar("Object");

  static term(
    name: mixed,
    meta?: TypeMeta = {},
    properties: Array<[string, VariableInfo]>,
    ...args: Array<any>
  ) {
    let parent: TypeScope | void = meta.parent || Type.GlobalTypeScope;
    const length = properties.length;
    for (let i = 0; i < length; i++) {
      const property = properties[i][1];
      if (property instanceof VariableInfo) {
        const propertyType = property.type;
        if (
          !TypeVar.isSelf(propertyType) &&
          (parent === undefined ||
            parent.priority < propertyType.parent.priority)
        ) {
          parent = propertyType.parent;
        }
      }
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, properties, ...args);
  }

  static getName(params: Array<[string, any]>, type?: ObjectType) {
    if (type !== undefined && String(type.name)[0] !== "{") {
      return undefined;
    }
    const filteredProperties = params ? unique(params, ([key]) => key) : [];
    return `{ ${filteredProperties
      .sort(([name1], [name2]) => String(name1).localeCompare(String(name2)))
      .map(
        ([name, type]) =>
          `${name}: ${String(
            type instanceof VariableInfo ? type.type.name : type.name
          )}`
      )
      .join(", ")} }`;
  }

  isNominal: boolean;
  properties: Map<string, VariableInfo>;
  onlyLiteral = true;
  instanceType: Type | null = null;

  constructor(
    name: ?string,
    options: ExtendedTypeMeta = {},
    properties: Array<[string, VariableInfo]>
  ) {
    super(name, {
      isSubtypeOf: name === "Object" ? undefined : ObjectType.Object,
      ...options
    });
    this.isNominal = Boolean(options.isNominal);
    const filteredProperties = properties
      ? unique(properties, ([key]) => key)
      : [];
    this.properties = new Map(filteredProperties);
  }

  getPropertyType(
    propertyName: mixed
  ): ?Type | ClassProperty | ObjectProperty | ClassMethod | ObjectMethod {
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
      if (type === undefined || [CALLABLE, INDEXABLE, CONSTRUCTABLE].includes(key)) {
        continue;
      }
      const anotherProperty = anotherType.properties.get(key) || {
        type: Type.Undefined
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
    typeScope: TypeScope
  ): Type {
    let isAnyPropertyChanged = false;
    const newProperties: Array<[string, VariableInfo]> = [];
    this.properties.forEach((vInfo, key) => {
      if (!(vInfo instanceof VariableInfo)) {
        return;
      }
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
      this.isSubtypeOf === null || this.isSubtypeOf === ObjectType.Object
        ? this.isSubtypeOf
        : this.isSubtypeOf.changeAll(sourceTypes, targetTypes, typeScope);
    if (!isAnyPropertyChanged && this.isSubtypeOf === isSubtypeOf) {
      return this;
    }
    return ObjectType.term(
      ObjectType.getName(newProperties, this) ||
        this.getChangedName(sourceTypes, targetTypes),
      { isSubtypeOf },
      newProperties
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

  isInHierarchyOf(anotherType: Type) {
    do {
      if (this === anotherType) {
        return true;
      }
      // $FlowIssue
      anotherType = anotherType.isSubtypeOf;
    } while (anotherType && anotherType.isSubtypeOf);
    return false;
  }

  isSuperTypeFor(anotherType: Type): boolean {
    anotherType = this.getOponentType(anotherType);
    if (
      (anotherType instanceof ObjectType && this === ObjectType.Object.root) ||
      this.isInHierarchyOf(anotherType)
    ) {
      return true;
    }
    const requiredProperties = [...this.properties.values()].filter(
      ({ type }) =>
        !(type instanceof UnionType) ||
        !type.variants.some(t => t.equalsTo(Type.Undefined))
    );
    return anotherType instanceof ObjectType && !this.isNominal
      ? anotherType.properties.size >= requiredProperties.length &&
          anotherType.properties.size <= this.properties.size &&
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
      if (property instanceof VariableInfo && property.type.contains(type)) {
        return true;
      }
    }
    return false;
  }

  weakContains(type: Type) {
    return super.contains(type) || this.equalsTo(type);
  }
}
