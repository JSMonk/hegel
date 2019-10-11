import HegelError from "../../utils/errors";
import { Type } from "./type";
import { Scope } from "../scope";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { TupleType } from "./tuple-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { FunctionType } from "./function-type";
import { CollectionType } from "./collection-type";

export class $PropertyType extends GenericType {
  constructor() {
    super(
      "$PropertyType",
      [new TypeVar("target"), new TypeVar("property")],
      null,
      null
    );
  }

  findRealTarget(target, loc) {
    if (target instanceof UnionType) {
      return target;
    }
    let obj = target;
    while (obj !== null && !(obj instanceof ObjectType)) {
      obj = obj.isSubtypeOf;
    }
    return obj;
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [currentTarget, property] = parameters;
    const realTarget = currentTarget.constraint || currentTarget;
    const propertyName =
      property.isSubtypeOf && property.isSubtypeOf.name === "string"
        ? property.name.slice(1, -1)
        : property.name;

    if (currentTarget instanceof UnionType) {
      const variants = currentTarget.variants.map(v =>
        this.applyGeneric([v, property], loc, shouldBeMemoize, isCalledAsBottom)
      );
      return new UnionType(UnionType.getName(variants), variants);
    }
    const fieldType = currentTarget.getPropertyType(propertyName);
    if (!property.isSubtypeOf && !isCalledAsBottom) {
      throw new HegelError("Second parameter should be an literal", loc);
    }
    if (fieldType !== null) {
      return fieldType;
    }
    throw new HegelError(
      `Property "${propertyName}" are not exists in "${currentTarget.name}"`,
      loc
    );
  }
}
