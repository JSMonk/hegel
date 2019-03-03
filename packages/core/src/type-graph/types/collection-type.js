// @flow
import { Type } from "./type";
import { TupleType } from "./tuple-type";
import { UnionType } from "./union-type";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";

export class CollectionType<K: Type, V: Type> extends Type {
  static createTypeWithName = createTypeWithName(CollectionType);

  static getName(keyType: Type, valueType: Type) {
    return `{ [key: ${getNameForType(keyType)}]: ${getNameForType(
      valueType
    )} }`;
  }

  keyType: K;
  valueType: V;

  constructor(name: string, keyType: K, valueType: V) {
    super(name);
    this.keyType = keyType;
    this.valueType = valueType;
  }

  hasProperty(property: mixed) {
    return (
      typeof property === this.keyType.name || property === this.keyType.name
    );
  }

  getPropertyType(propertyName: mixed) {
    if (!this.hasProperty(propertyName)) {
      throw new Error("Unknow property");
    }
    return this.valueType instanceof UnionType &&
      this.valueType.variants.find(a => a.name === "void")
      ? this.valueType
      : new UnionType(UnionType.getName([this.valueType, new Type("void")]), [
          this.valueType,
          new Type("void")
        ]);
  }

  equalsTo(anotherType: Type) {
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
    if (newValueType === this.valueType) {
      return this;
    }
    return CollectionType.createTypeWithName(
      CollectionType.getName(this.keyType, newValueType),
      typeScope,
      this.keyType,
      newValueType
    );
  }
}
