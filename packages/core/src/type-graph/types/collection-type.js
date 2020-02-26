// @flow
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TupleType } from "./tuple-type";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { GenericType } from "./generic-type";
import type { TypeMeta } from "./type";
import type { SourceLocation } from "@babel/parser";

export class CollectionType<K: Type, V: Type> extends Type {
  static get name() {
    return "CollectionType";
  }

  static Array = new TypeVar("Array");

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
    anotherType = this.getOponentType(anotherType, true, false);
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    if (
      "readonly" in anotherType &&
      this.equalsTo(
        TupleType.ReadonlyArray.root.applyGeneric([this.valueType])
      ) &&
      this === anotherType.readonly
    ) {
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
        (this.equalsTo(
          CollectionType.Array.root.applyGeneric([this.valueType])
        ) ||
          this.equalsTo(
            TupleType.ReadonlyArray.root.applyGeneric([this.valueType])
          )) &&
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
    const currentSelf = TypeVar.createSelf(
      this.getChangedName(sourceTypes, targetTypes),
      this.parent
    );
    if (
      this._changeStack !== null &&
      this._changeStack.find(a => a.equalsTo(currentSelf))
    ) {
      return currentSelf;
    }
    this._changeStack =
      this._changeStack === null
        ? [currentSelf]
        : [...this._changeStack, currentSelf];
    try {
      const newValueType = this.valueType.changeAll(
        sourceTypes,
        targetTypes,
        typeScope
      );
      const isSubtypeOf =
        this.isSubtypeOf &&
        this.isSubtypeOf.changeAll(sourceTypes, targetTypes, typeScope);
      return this.endChanges(
        newValueType === this.valueType && isSubtypeOf === this.isSubtypeOf
          ? this
          : CollectionType.term(
              this.getChangedName(sourceTypes, targetTypes),
              { isSubtypeOf },
              this.keyType,
              newValueType
            )
      );
    } catch (e) {
      this._changeStack = null;
      throw e;
    }
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    type = this.getOponentType(type);
    if (this._alreadyProcessedWith === type || this.referenceEqualsTo(type)) {
      return [];
    }
    this._alreadyProcessedWith = type;
    if (type instanceof TupleType) {
      // $FlowIssue
      type = type.isSubtypeOf;
    }
    if (type instanceof CollectionType) {
      const keyDiff = this.keyType.getDifference(
        type.keyType,
        withReverseUnion
      );
      const valueDiff = this.valueType.getDifference(
        type.valueType,
        withReverseUnion
      );
      this._alreadyProcessedWith = null;
      return keyDiff.concat(valueDiff);
    }
    const result = super.getDifference(type, withReverseUnion);
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

  getNextParent(typeScope: TypeScope) {
    if (this._alreadyProcessedWith !== null) {
      return Type.GlobalTypeScope;
    }
    this._alreadyProcessedWith = this;
    const sortedParents = [this.keyType, this.valueType]
      .map(a => a.getNextParent(typeScope))
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

export class $Collection extends GenericType<Type> {
  static get name() {
    return "$Collection";
  }

  constructor(_: mixed, meta: TypeMeta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$Collection",
      meta,
      [TypeVar.term("key", { parent }), TypeVar.term("value", { parent })],
      parent,
      // $FlowIssue
      null
    );
  }

  isPrincipalTypeFor() {
    return false;
  }

  equalsTo() {
    return false;
  }

  isSuperTypeFor() {
    return false;
  }

  applyGeneric(
    parameters: Array<Type>,
    loc: SourceLocation,
    shouldBeMemoize?: boolean = true,
    isCalledAsBottom?: boolean = false
  ) {
    super.assertParameters(parameters, loc);
    const [key, value] = parameters;
    return CollectionType.term(
      `$Collection<${String(key.name)}, ${String(value.name)}>`,
      {},
      key,
      value
    );
  }
}
