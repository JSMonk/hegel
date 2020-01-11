// @flow
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TupleType } from "./tuple-type";
import { UnionType } from "./union-type";
import { GenericType } from "./generic-type";
import type { TypeMeta } from "./type";
import type { TypeScope } from "../type-scope";

export class CollectionType<K: Type, V: Type> extends Type {
  static term(
    name: mixed,
    meta?: TypeMeta = {},
    keyType: Type,
    valueType: Type,
    ...args: Array<any>
  ) {
    let parent: TypeScope | void = meta.parent;
    if (
      !TypeVar.isSelf(keyType) &&
      (parent === undefined || keyType.parent.priority > parent.priority)
    ) {
      parent = keyType.parent;
    }
    if (
      !TypeVar.isSelf(valueType) &&
      (parent === undefined || valueType.parent.priority > parent.priority)
    ) {
      parent = valueType.parent;
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, keyType, valueType, ...args);
  }

  static getName(keyType: Type, valueType: Type) {
    return `{ [key: ${String(keyType.name)}]: ${String(valueType.name)} }`;
  }

  keyType: K;
  valueType: V;
  onlyLiteral = true;

  constructor(name: string, meta?: TypeMeta = {}, keyType: K, valueType: V) {
    super(name, meta);
    this.keyType = keyType;
    this.valueType = valueType;
  }

  getPropertyType(propertyName: mixed, isForAssign: boolean = false): ?Type {
    if (
      typeof propertyName === this.keyType.name ||
      propertyName === this.keyType.name
    ) {
      if (isForAssign) {
        return this.valueType;
      }
      const result =
        this.valueType instanceof UnionType &&
        this.valueType.variants.some(a => a.equalsTo(Type.Undefined))
          ? this.valueType
          : UnionType.term(
              UnionType.getName([this.valueType, Type.Undefined]),
              {},
              [this.valueType, Type.Undefined]
            );
      if (result) {
        return result;
      }
    }
    return super.getPropertyType(propertyName);
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
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
    anotherType = this.getOponentType(anotherType);
    const selfNameWithoutApplying = GenericType.getNameWithoutApplying(
      this.name
    );
    const otherfNameWithoutApplying = GenericType.getNameWithoutApplying(
      anotherType.name
    );
    return (
      (anotherType instanceof CollectionType &&
        selfNameWithoutApplying === otherfNameWithoutApplying &&
        this.keyType.equalsTo(anotherType.keyType) &&
        this.valueType.isPrincipalTypeFor(anotherType.valueType)) ||
      (anotherType instanceof TupleType &&
        (anotherType.isSubtypeOf === null ||
          selfNameWithoutApplying ===
            GenericType.getNameWithoutApplying(anotherType.isSubtypeOf.name)) &&
        this.keyType.equalsTo(Type.Number) &&
        anotherType.items.every(t => this.valueType.isPrincipalTypeFor(t)))
    );
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
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
    return CollectionType.term(
      this.getChangedName(sourceTypes, targetTypes),
      { isSubtypeOf },
      this.keyType,
      newValueType
    );
  }

  getDifference(type: Type) {
    type = this.getOponentType(type);
    if (type instanceof CollectionType) {
      const keyDiff = this.keyType.getDifference(type.keyType);
      const valueDiff = this.valueType.getDifference(type.valueType);
      return keyDiff.concat(valueDiff);
    }
    return super.getDifference(type);
  }

  contains(type: Type) {
    return (
      super.contains(type) ||
      this.keyType.contains(type) ||
      this.valueType.contains(type)
    );
  }

  weakContains(type: Type) {
    return (
      super.contains(type) ||
      this.keyType.weakContains(type) ||
      this.valueType.weakContains(type)
    );
  }

  makeNominal() {
    // $FlowIssue
    this.isSubtypeOf.makeNominal();
  }
}
