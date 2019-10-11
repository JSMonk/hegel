// @flow
import { Type } from "./type";
import { TupleType } from "./tuple-type";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeMeta } from "./type";

export class CollectionType<K: Type, V: Type> extends Type {
  static createTypeWithName = createTypeWithName(CollectionType);

  static getName(keyType: Type, valueType: Type) {
    return `{ [key: ${getNameForType(keyType)}]: ${getNameForType(
      valueType
    )} }`;
  }

  keyType: K;
  valueType: V;
  onlyLiteral = true;

  constructor(name: string, keyType: K, valueType: V, meta?: TypeMeta = {}) {
    super(name, meta);
    this.keyType = keyType;
    this.valueType = valueType;
  }

  getPropertyType(propertyName: mixed): ?Type {
    if (
      typeof propertyName === this.keyType.name ||
      propertyName === this.keyType.name
    ) {
      const result =
        this.valueType instanceof UnionType &&
        this.valueType.variants.some(a => a.name === "undefined")
          ? this.valueType
          : new UnionType(
              UnionType.getName([this.valueType, new Type("undefined")]),
              [this.valueType, new Type("undefined")]
            );
      if (result) {
        return result;
      }
    }
    return super.getPropertyType(propertyName);
  }

  equalsTo(anotherType: Type) {
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }

    return (
      anotherType instanceof CollectionType &&
      super.equalsTo(anotherType) &&
      this.keyType.equalsTo(anotherType.keyType) &&
      this.valueType.equalsTo(anotherType.valueType)
    );
  }

  isSuperTypeFor(anotherType: any) {
    return (
      (anotherType instanceof CollectionType &&
        this.keyType.equalsTo(anotherType.keyType) &&
        this.valueType.isPrincipalTypeFor(anotherType.valueType)) ||
      (anotherType instanceof TupleType &&
        this.keyType.equalsTo(new Type("number")) &&
        anotherType.items.every(t => this.valueType.isPrincipalTypeFor(t)))
    );
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    const newValueType = this.valueType.changeAll(
      sourceTypes,
      targetTypes,
      typeScope
    );
    const isSubtypeOf =
      this.isSubtypeOf &&
      this.isSubtypeOf.changeAll(sourceTypes, targetTypes, typeScope);
    if (newValueType === this.valueType && isSubtypeOf === this.isSubtypeOf) {
      return this;
    }
    return CollectionType.createTypeWithName(
      this.getChangedName(sourceTypes, targetTypes),
      typeScope,
      this.keyType,
      newValueType,
      { isSubtypeOf }
    );
  }
}
