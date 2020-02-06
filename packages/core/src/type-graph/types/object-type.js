// @flow
import { Type } from "./type";
import { unique } from "../../utils/common";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { FunctionType } from "./function-type";
import { VariableInfo } from "../variable-info";
import { $AppliedImmutable } from "./immutable-type";
import { CALLABLE, INDEXABLE, CONSTRUCTABLE } from "../constants";
import type { TypeMeta } from "./type";
import type { TypeScope } from "../type-scope";
import type {
  ClassProperty,
  ObjectProperty,
  ClassMethod,
  ObjectMethod
} from "@babel/core";

type ExtendedTypeMeta = { ...TypeMeta, isNominal?: boolean, isSoft?: boolean };

export class ObjectType extends Type {
  static Object = new TypeVar("Object");

  static term(
    name: mixed,
    meta?: TypeMeta = {},
    properties: Array<[string, VariableInfo]>,
    ...args: Array<any>
  ) {
    name =
      name == undefined
        ? // $FlowIssue
          ObjectType.getName(properties, undefined, meta.isSoft)
        : name;
    let parent: TypeScope | void = meta.parent || Type.GlobalTypeScope;
    const length = properties.length;
    for (let i = 0; i < length; i++) {
      const property = properties[i][1];
      if (property instanceof VariableInfo) {
        const propertyType = property.type;
        if (
          parent === undefined ||
          parent.priority < propertyType.parent.priority
        ) {
          parent = propertyType.parent;
        }
      }
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, properties, ...args);
  }

  static getName(
    params: Array<[string, any]>,
    type?: ObjectType,
    isSoft?: boolean = false
  ) {
    if (type !== undefined && String(type.name)[0] !== "{") {
      return undefined;
    }
    const filteredProperties = params ? unique(params, ([key]) => key) : [];
    const properties = filteredProperties.sort(([name1], [name2]) =>
      String(name1).localeCompare(String(name2))
    );
    return this.prettyMode && filteredProperties.length > 2
      ? this.multyLine(properties, isSoft)
      : this.oneLine(properties, isSoft);
  }

  static oneLine(properties: Array<[string, Type]>, isSoft: boolean) {
    return `{ ${properties
      .map(
        ([name, type]) =>
          `${name}: ${String(
            Type.getTypeRoot(type instanceof VariableInfo ? type.type : type)
              .name
          )}`
      )
      .join(", ")}${isSoft ? ", ..." : ""} }`;
  }

  static multyLine(properties: Array<[string, Type]>, isSoft: boolean) {
    return `{\n${properties
      .map(
        ([name, type]) =>
          `\t${name}: ${String(
            Type.getTypeRoot(type instanceof VariableInfo ? type.type : type)
              .name
          ).replace(/\n/g, "\n\t")}`
      )
      .join(",\n")}\n${isSoft ? "\t...\n" : ""}}`;
  }

  isNominal: boolean;
  properties: Map<string, VariableInfo>;
  instanceType: Type | null = null;
  isStrict: boolean = true;
  priority = 2;

  constructor(
    name: ?string,
    options: ExtendedTypeMeta = {},
    properties: Array<[string, VariableInfo]>
  ) {
    name =
      name == undefined
        ? // $FlowIssue
          ObjectType.getName(properties, undefined, options.isSoft)
        : name;
    super(name, {
      isSubtypeOf: name === "Object" ? undefined : ObjectType.Object,
      ...options
    });
    this.isNominal = Boolean(options.isNominal);
    const filteredProperties = properties
      ? unique(properties, ([key]) => key)
      : [];
    this.properties = new Map(filteredProperties);
    this.onlyLiteral = true;
    this.isStrict = !options.isSoft;
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
      if (
        type === undefined ||
        [CALLABLE, INDEXABLE, CONSTRUCTABLE].includes(key)
      ) {
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
    if (sourceTypes.every(type => !this.canContain(type))) {
      return this;
    }
    if (this._alreadyProcessedWith !== null) {
      return this._alreadyProcessedWith;
    }
    this._alreadyProcessedWith = TypeVar.createSelf(
      this.getChangedName(sourceTypes, targetTypes),
      this.parent
    );
    let isAnyPropertyChanged = false;
    try {
      const newProperties: Array<[string, VariableInfo]> = [];
      this.properties.forEach((vInfo, key) => {
        if (!(vInfo instanceof VariableInfo)) {
          return;
        }
        const newType = vInfo.type.changeAll(
          sourceTypes,
          targetTypes,
          typeScope
        );
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
        this._alreadyProcessedWith = null;
        return this;
      }
      const isSoft = !this.isStrict;
      const result = ObjectType.term(
        ObjectType.getName(newProperties, this, isSoft) ||
          this.getChangedName(sourceTypes, targetTypes),
        { isSubtypeOf, isSoft },
        newProperties
      );
      return this.endChanges(result);
    } catch (e) {
      this._alreadyProcessedWith = null;
      throw e;
    }
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType, true, false);
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }
    if (
      !(anotherType instanceof ObjectType) ||
      (this.isStrict &&
        (anotherType.properties.size !== this.properties.size ||
          !super.equalsTo(anotherType))) ||
      !this.canContain(anotherType)
    ) {
      return false;
    }
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    const result = this.isAllProperties("equalsTo", anotherType);
    this._alreadyProcessedWith = null;
    return result;
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
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    const requiredProperties = [...this.properties.values()].filter(
      ({ type }) => {
        // $FlowIssue
        type = "readonly" in type ? type.readonly : type;
        return (
          !(type instanceof UnionType) ||
          !type.variants.some(t => t.equalsTo(Type.Undefined))
        );
      }
    );
    const result =
      anotherType instanceof ObjectType && !this.isNominal
        ? anotherType.properties.size >= requiredProperties.length &&
          (!this.isStrict ||
            anotherType.properties.size <= this.properties.size) &&
          this.isAllProperties("isPrincipalTypeFor", anotherType)
        : anotherType.isSubtypeOf != undefined &&
          this.isPrincipalTypeFor(anotherType.isSubtypeOf);
    this._alreadyProcessedWith = null;
    return result;
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    if (this._alreadyProcessedWith === type || this.referenceEqualsTo(type)) {
      return [];
    }
    this._alreadyProcessedWith = type;
    if (type instanceof ObjectType) {
      let differences = [];
      const { properties } = type;
      this.properties.forEach(({ type }, key) => {
        const other = properties.get(key);
        if (other === undefined) {
          return;
        }
        differences = differences.concat(
          type.getDifference(other.type, withReverseUnion)
        );
      });
      this._alreadyProcessedWith = null;
      return differences;
    }
    if (type instanceof FunctionType) {
      const callable = this.properties.get(CALLABLE);
      if (callable !== undefined) {
        const result = callable.type.getDifference(type, withReverseUnion);
        this._alreadyProcessedWith = null;
        return result;
      }
    }
    const result = super.getDifference(type, withReverseUnion);
    this._alreadyProcessedWith = null;
    return result;
  }

  contains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    if (super.contains(type)) {
      return true;
    }
    this._alreadyProcessedWith = type;
    for (const [_, property] of this.properties) {
      if (property instanceof VariableInfo && property.type.contains(type)) {
        this._alreadyProcessedWith = null;
        return true;
      }
    }
    this._alreadyProcessedWith = null;
    return false;
  }

  weakContains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result = super.contains(type) || this.equalsTo(type);
    this._alreadyProcessedWith = null;
    return result;
  }

  getNextParent(typeScope: TypeScope) {
    if (this._alreadyProcessedWith !== null) {
      return Type.GlobalTypeScope;
    }
    this._alreadyProcessedWith = this;
    const sortedParents = [...this.properties]
      .filter(([_, v]) => v instanceof VariableInfo)
      .map(([_, { type }]) => type.getNextParent(typeScope))
      .sort((a, b) => b.priority - a.priority);
    for (const parent of sortedParents) {
      if (parent.priority <= typeScope.priority && parent !== typeScope) {
        this._alreadyProcessedWith = null;
        return parent;
      }
    }
    this._alreadyProcessedWith = null;
    return Type.GlobalTypeScope;
  }
}
