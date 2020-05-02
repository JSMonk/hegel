import { Type } from "./type";

export class $Refinemented extends Type {
  static get name() {
    return "$Refinemented";
  }

  refinemented: Type;
  from: Type;

  constructor(refinemented, from) {
    super(refinemented.name, { parent: refinemented.parent });
    this.refinemented = refinemented;
    this.from = from;
  }

  equalsTo(type) {
    if (type.referenceEqualsTo(this)) {
      return true;
    }
    return type instanceof $Refinemented
      ? this.refinemented.equalsTo(type.refinemented)
      : this.refinemented.isPrincipalTypeFor(type);
  }

  isSuperTypeFor(type) {
    if (type instanceof $Refinemented) {
      return this.refinemented.isSuperTypeFor(type.refinemented);
    }
    return this.refinemented.isSuperTypeFor(type);
  }

  contains(type) {
    return this.refinemented.contains(type);
  }

  weakContains(type) {
    return this.refinemented.contains(type);
  }

  changeAll(...args) {
    return this.refinemented.changeAll(...args);
  }

  getPropertyType(propertyName: mixed): ?Type {
    return this.refinemented.getPropertyType(propertyName);
  }
}
