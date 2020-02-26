import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { ObjectType } from "./object-type";
import { $BottomType } from "./bottom-type";
import { GenericType } from "./generic-type";

export class $InstanceOf extends GenericType {
  static get name() {
    return "$InstanceOf";
  }

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
    let [target, ...genericParameters] = parameters;
    const oldGenericArguments = this.genericArguments;
    if (!(target instanceof ObjectType && target.instanceType !== null)) {
      throw new HegelError("Cannot apply $InstanceOf to non-class type", loc);
    }
    let instanceType = target.instanceType;
    if (instanceType instanceof $BottomType) {
      this.genericArguments = this.genericArguments.concat(
        instanceType.genericArguments
      );
      instanceType = instanceType.subordinateMagicType.applyGeneric(
        genericParameters,
        loc
      );
    }
    try {
      super.assertParameters(parameters, loc);
      return instanceType;
    } finally {
      this.genericArguments = oldGenericArguments;
    }
  }
}
