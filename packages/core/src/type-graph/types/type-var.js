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
    return this.constraint.isSuperTypeFor(type);
  }
}
