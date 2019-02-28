// @flow
import { Type } from "./type";
import { createTypeWithName } from "./create-type";

export class TypeVar extends Type {
  static createTypeWithName = createTypeWithName(TypeVar);

  constraint: ?Type;
  root: ?Type;
  isUserDefined: ?boolean;

  constructor(
    name: string,
    constraint: ?Type,
    isUserDefined?: boolean = false
  ) {
    super(name);
    this.name = name;
    this.constraint = constraint;
    this.isUserDefined = isUserDefined;
  }

  equalsTo(anotherType: Type) {
    if (!this.constraint) {
      return true;
    }
    return this.constraint.isSuperTypeFor(anotherType);
  }

  isSuperTypeFor(type: Type): boolean {
    return this.equalsTo(type);
  }
}

