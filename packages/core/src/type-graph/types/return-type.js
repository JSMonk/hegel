import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { FunctionType } from "./function-type";

export class $ReturnType extends GenericType {
  constructor() {
    super("$ReturnType", [new TypeVar("target")], null, null);
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
    if (!(realTarget instanceof FunctionType)) {
      throw new HegelError("First parameter should be an function type", loc);
    }
    return realTarget.returnType;
  }
}
