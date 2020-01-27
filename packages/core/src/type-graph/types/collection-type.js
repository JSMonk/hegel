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
    if (parent === undefined || keyType.parent.priority > parent.priority) {
      parent = keyType.parent;
    }
    if (parent === undefined || valueType.parent.priority > parent.priority) {
      parent = valueType.parent;
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, keyType, valueType, ...args);
  }

  static getName(keyType: Type, valueType: Type) {
    return `{ [key: ${String(Type.getTypeRoot(keyType).name)}]: ${String(
      Type.getTypeRoot(valueType).name
    )} }`;
  }

  keyType: K;
  valueType: V;
  priority = 2;

  constructor(name: string, meta?: TypeMeta = {}, keyType: K, valueType: V) {
    super(name, meta);
    this.keyType = keyType;
    this.valueType = valueType;
    this.onlyLiteral = true;
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
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    const result =
      anotherType instanceof CollectionType &&
      super.equalsTo(anotherType) &&
      this.canContain(anotherType) &&
      this.keyType.equalsTo(anotherType.keyType) &&
      this.valueType.equalsTo(anotherType.valueType);
    this._alreadyProcessedWith = null;
    return result;
  }

  isSuperTypeFor(anotherType: any) {
    anotherType = this.getOponentType(anotherType);
    const selfNameWithoutApplying = GenericType.getNameWithoutApplying(
      this.name
    );
    const otherfNameWithoutApplying = GenericType.getNameWithoutApplying(
      anotherType.name
    );
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    const result =
      (anotherType instanceof CollectionType &&
        selfNameWithoutApplying === otherfNameWithoutApplying &&
        this.keyType.equalsTo(anotherType.keyType) &&
        this.valueType.isPrincipalTypeFor(anotherType.valueType)) ||
      (anotherType instanceof TupleType &&
        (anotherType.isSubtypeOf === null ||
          selfNameWithoutApplying ===
            GenericType.getNameWithoutApplying(anotherType.isSubtypeOf.name)) &&
        this.keyType.equalsTo(Type.Number) &&
        anotherType.items.every(t => this.valueType.isPrincipalTypeFor(t)));
    this._alreadyProcessedWith = null;
    return result;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
  ) {
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
    try {
      const newValueType = this.valueType.changeAll(
        sourceTypes,
        targetTypes,
        typeScope
      );
      const isSubtypeOf =
        this.isSubtypeOf &&
        this.isSubtypeOf.changeAll(sourceTypes, targetTypes, typeScope);
      if (newValueType === this.valueType && isSubtypeOf === this.isSubtypeOf) {
        this._alreadyProcessedWith = null;
        return this;
      }
      return this.endChanges(
        CollectionType.term(
          this.getChangedName(sourceTypes, targetTypes),
          { isSubtypeOf },
          this.keyType,
          newValueType
        )
      );
    } catch (e) {
      this._alreadyProcessedWith = null;
      throw e;
    }
  }

  getDifference(type: Type) {
    type = this.getOponentType(type);
    if (this._alreadyProcessedWith === type) {
      return [];
    }
    this._alreadyProcessedWith = type;
    if (type instanceof CollectionType) {
      const keyDiff = this.keyType.getDifference(type.keyType);
      const valueDiff = this.valueType.getDifference(type.valueType);
      this._alreadyProcessedWith = null;
      return keyDiff.concat(valueDiff);
    }
    const result = super.getDifference(type);
    this._alreadyProcessedWith = null;
    return result;
  }

  contains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.contains(type) ||
      this.keyType.contains(type) ||
      this.valueType.contains(type);
    this._alreadyProcessedWith = null;
    return result;
  }

  weakContains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.contains(type) ||
      this.keyType.weakContains(type) ||
      this.valueType.weakContains(type);
    this._alreadyProcessedWith = null;
    return result;
  }

  makeNominal() {
    // $FlowIssue
    this.isSubtypeOf.makeNominal();
  }
}
