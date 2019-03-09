import HegelError from "../../utils/errors";
import { Type } from "./type";
import { Scope } from "../scope";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
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

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [target, property] = parameters;
    const realTarget = target.constraint || target;
    if (
      !(
        target instanceof ObjectType ||
        target instanceof CollectionType ||
        target instanceof UnionType
      )
    ) {
      throw new HegelError(
        "First parameter should be an object or collection",
        loc
      );
    }
    if (target instanceof UnionType) {
      const variants = target.variants.map(v =>
        this.applyGeneric([v, property], loc, shouldBeMemoize, isCalledAsBottom)
      );
      return new UnionType(UnionType.getName(variants), variants);
    }
    if (!property.isLiteralOf && !isCalledAsBottom) {
      throw new HegelError("Second parameter should be an literal", loc);
    }
    try {
      return target.getPropertyType(property.name);
    } catch {
      throw new HegelError(
        `Property "${property.name}" are not exists in "${target.name}"`,
        loc
      );
    }
  }
}
