// @flow
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";

export type TypeMeta = {
  isLiteralOf?: Type
};

export class Type {
  static createTypeWithName = createTypeWithName(Type);

  name: mixed;
  isLiteralOf: ?Type;

  constructor(name: mixed, meta?: TypeMeta = {}) {
    const { isLiteralOf = null } = meta;
    this.name = name;
    this.isLiteralOf = isLiteralOf;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    const indexOfNewType = sourceTypes.indexOf(this);
    return indexOfNewType === -1 ? this : targetTypes[indexOfNewType];
  }

  equalsTo(anotherType: Type) {
    return this.name === anotherType.name;
  }

  isSuperTypeFor(type: Type): boolean {
    return type.isLiteralOf === this;
  }

  isPrincipalTypeFor(type: Type): boolean {
    return (
      this.equalsTo(new Type("mixed")) ||
      this.equalsTo(type) ||
      this.isSuperTypeFor(type)
    );
  }
}
