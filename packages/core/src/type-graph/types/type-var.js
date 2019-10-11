// @flow
import { Type } from "./type";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeMeta } from "./type";

export class TypeVar extends Type {
  static createTypeWithName = createTypeWithName(TypeVar);

  constraint: ?Type;
  root: ?Type;
  isUserDefined: ?boolean;

  constructor(
    name: string,
    constraint: ?Type,
    isUserDefined?: boolean = false,
    meta?: TypeMeta = {}
  ) {
    super(name, meta);
    this.name = name;
    this.constraint = constraint;
    this.isUserDefined = isUserDefined;
  }

  equalsTo(anotherType: Type) {
    const isDifferenceInDefinition =
      this.isUserDefined &&
      anotherType instanceof TypeVar &&
      !anotherType.isUserDefined;
    if (
      this.constraint === undefined ||
      isDifferenceInDefinition ||
      this.referenceEqualsTo(anotherType)
    ) {
      return true;
    }
    if (this.root != undefined) {
      return this.root.equalsTo(anotherType);
    }
    const isEqualsTypes =
      anotherType instanceof TypeVar &&
      anotherType.constraint !== undefined &&
      super.equalsTo(anotherType) &&
      // $FlowIssue
      this.constraint.equalsTo(anotherType.constraint);
    // $FlowIssue
    return isEqualsTypes || this.constraint.equalsTo(anotherType);
  }

  isSuperTypeFor(type: Type): boolean {
    if (!this.constraint) {
      return true;
    }
    if (this.root != undefined) {
      return this.root.isSuperTypeFor(type);
    }
    return this.constraint.isSuperTypeFor(type);
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ): Type {
    const indexOfNewType = sourceTypes.indexOf(this);
    const indexOfNewRootType = sourceTypes.findIndex(
      a => this.root === a && a != undefined
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
}
