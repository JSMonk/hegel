import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";

export class $Readonly extends GenericType {
  constructor() {
    super("$Readonly", [new TypeVar("target")], null, null);
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [target] = parameters;
    if (!(target instanceof Type)) {
      throw new HegelError("First parameter should be an type", loc);
    }
    return new UnionType(UnionType.getName(variants), variants);
  }
}
