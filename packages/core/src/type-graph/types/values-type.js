import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";

export class $Values extends GenericType {
  constructor() {
    super("$Values", [new TypeVar("target")], null, null);
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [target] = parameters;
    const realTarget = target.constraint || target;
    if (!(realTarget instanceof ObjectType)) {
      throw new HegelError("First parameter should be an object type", loc);
    }
    const values = [...realTarget.properties.values()];
    const variants = values.map(value => value.type);
    return new UnionType(UnionType.getName(variants), variants);
  }
}
