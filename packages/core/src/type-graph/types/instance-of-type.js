import HegelError from "../../utils/errors";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";

export class $InstanceOf extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$InstanceOf",
      meta,
      [TypeVar.term("target", { parent })],
      parent,
      null
    );
  }

  isPrincipalTypeFor() {
    return false;
  }

  equalsTo() {
    return false;
  }

  isSuperTypeFor() {
    return false;
  }

  applyGeneric(parameters, loc) {
    super.assertParameters(parameters, loc);
    const [target] = parameters;
    if (
      !(target instanceof ObjectType && target.instanceType !== null)
    ) {
      throw new HegelError("Cannot apply $InstanceOf to non-class type", loc);
    }
    return target.instanceType;
  }
}
