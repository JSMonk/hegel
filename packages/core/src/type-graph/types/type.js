// @flow
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";

export type TypeMeta = {
  isSubtypeOf?: ?Type
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

  getChangedName(sourceTypes: Array<Type>, targetTypes: Array<Type>) {
    return `${String(this.name)}<${targetTypes.reduce(
      (res, target, i) =>
        "root" in sourceTypes[i]
          ? `${res}${i === 0 ? "" : ", "}${String(target.name)}`
          : res,
      ""
    )}>`;
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

  getPropertyType(propertyName: mixed): ?Type {
    if (this.isSubtypeOf != null) {
      return this.isSubtypeOf.getPropertyType(propertyName);
    }
    return null;
  }

  isPrincipalTypeFor(type: Type): boolean {
    return (
      this.equalsTo(new Type("mixed")) ||
      this.equalsTo(type) ||
      this.isSuperTypeFor(type)
    );
  }

  getDifference(type: Type) {
    if ("variants" in type) {
      // $FlowIssue
      return type.variants.flatMap(a => this.getDifference(a));
    }
    if ("root" in type) {
      return [{ root: this, variable: type }];
    }
    return [];
  }

  contains(type: Type) {
    return this === type;
  }

  getOponentType(type: Type) {
    if ("unpack" in type) {
      // $FlowIssue
      type = type.unpack();
    }
    if ("subordinateType" in type) {
      // $FlowIssue
      type = type.subordinateType;
    }
    return type;
  }
}
