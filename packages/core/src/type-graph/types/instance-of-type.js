import HegelError from "../../utils/errors";
import { TypeVar } from "./type-var";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";

export class $InstanceOf extends GenericType {
  constructor() {
    super("$InstanceOf", [new TypeVar("target")], null, null);
  }

  applyGeneric(parameters, loc) {
    super.assertParameters(parameters, loc);
    const [target] = parameters;
    if (!(target.type instanceof ObjectType && target.type.instanceType !== null)) {
      throw new HegelError("Cannot apply $InstanceOf to non-class type", loc);
    }
    return target.type.instanceType;
  }
}
