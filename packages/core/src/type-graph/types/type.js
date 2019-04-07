// @flow
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";

export type TypeMeta = {
  isSubtypeOf?: Type
};

export class Type {
  static createTypeWithName = createTypeWithName(Type);

  name: mixed;
  isSubtypeOf: ?Type;

  constructor(name: mixed, meta?: TypeMeta = {}) {
    const { isSubtypeOf = null } = meta;
    this.name = name;
    this.isSubtypeOf = isSubtypeOf;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    const indexOfNewType = sourceTypes.indexOf(this);
    return indexOfNewType === -1 ? this : targetTypes[indexOfNewType];
  }

  referenceEqualsTo(anotherType: Type) {
    return this === anotherType;
  }

  equalsTo(anotherType: Type) {
    return (
      this.referenceEqualsTo(anotherType) || this.name === anotherType.name
    );
  }

  isSuperTypeFor(type: Type): boolean {
    if (!type.isSubtypeOf) {
      return false;
    }
    return this.isPrincipalTypeFor(type.isSubtypeOf);
  }

  isPrincipalTypeFor(type: Type): boolean {
    return (
      this.equalsTo(new Type("mixed")) ||
      this.equalsTo(type) ||
      this.isSuperTypeFor(type)
    );
  }
}
