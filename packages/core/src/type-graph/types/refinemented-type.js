import { Type } from "./type";
import { ObjectType } from "./object-type";
import { UnionType } from "./union-type";

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

  isSafe(
    from: Type = this.from,
    refinemented: Type = this.refinemented,
    insideObject: boolean = false
  ): boolean {
    if (from.equalsTo(Type.Unknown) && !refinemented.equalsTo(Type.Unknown)) {
      return !insideObject;
    }
    if (from instanceof ObjectType && refinemented instanceof ObjectType) {
      for (const [propertyName, property] of from.properties) {
        const refinementedProperty = refinemented.properties.get(propertyName);
        if (!this.isSafe(property.type, refinementedProperty.type, true)) {
          return false;
        }
      }
    }

    if (from instanceof UnionType) {
      return from.equalsTo(refinemented);
    }

    return true;
  }
}
