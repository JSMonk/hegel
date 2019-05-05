import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";

export class $Keys extends GenericType {
  constructor() {
    super("$Keys", [new TypeVar("target")], null, null);
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
    const keys = [...realTarget.properties.keys()];
    const variants = keys.map(
      key => new Type(`'${key}'`, { isSubtypeOf: new Type("string") })
    );
    return new UnionType(UnionType.getName(variants), variants);
  }
}
