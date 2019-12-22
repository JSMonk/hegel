// @flow
import { Type } from "./type";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeMeta } from "./type";

export class TypeVar extends Type {
  static createTypeWithName = createTypeWithName(TypeVar);

  constraint: ?Type;
  root: ?Type;
  _isUserDefined: ?boolean;

  get isUserDefined() {
    return this._isUserDefined;
  }

  set isUserDefined(isUserDefined: boolean) {
    this._isUserDefined = this._isUserDefined || isUserDefined;
  }

  constructor(
    name: string,
    constraint: ?Type,
    isUserDefined?: boolean = false,
    meta?: TypeMeta = {}
  ) {
    super(name, meta);
    this.name = name;
    this.constraint = constraint;
    this._isUserDefined = isUserDefined;
  }

  equalsTo(anotherType: Type, strict?: boolean = false) {
    const isDifferenceInDefinition =
      this.isUserDefined &&
      anotherType instanceof TypeVar &&
      !anotherType.isUserDefined &&
      !strict;
    if (isDifferenceInDefinition || this.referenceEqualsTo(anotherType)) {
      return true;
    }
    if (this.root != undefined) {
      return this.root.equalsTo(anotherType);
    }
    if (
      anotherType instanceof TypeVar &&
      anotherType.constraint !== undefined &&
      this.constraint !== undefined
    ) {
      return (
        (super.equalsTo(anotherType) &&
          // $FlowIssue
          this.constraint.equalsTo(anotherType.constraint)) ||
        // $FlowIssue
        this.constraint.equalsTo(anotherType)
      );
    }
    return super.equalsTo(anotherType);
  }

  isSuperTypeFor(type: Type): boolean {
    if (this.root != undefined) {
      return this.root.isSuperTypeFor(type);
    }
    if (!this.constraint) {
      return true;
    }
    return this.constraint.isSuperTypeFor(type);
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ): Type {
    const indexOfNewType = sourceTypes.indexOf(this);
    const indexOfNewRootType = sourceTypes.findIndex(a =>
      a.weakContains(this.root != undefined ? this.root : this)
    );
    if (indexOfNewType !== -1) {
      return targetTypes[indexOfNewType];
    }
    if (indexOfNewRootType !== -1) {
      return targetTypes[indexOfNewRootType];
    }
    return this;
  }

  applyGeneric() {
    return this;
  }

  getDifference(type: Type) {
    if (type instanceof TypeVar && this !== type) {
      return [{ root: this, variable: type }];
    }
    if ("variants" in type) {
      // $FlowIssue
      return type.variants.flatMap(a => this.getDifference(a));
    }
    return [];
  }

  contains(type: Type) {
    return this.equalsTo(type, true);
  }
}
