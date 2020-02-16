import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";
import { FunctionType } from "./function-type";

export class $ReturnType extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$ReturnType",
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

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    let [target, ...genericParameters] = parameters;
    const oldGenericArguments = this.genericArguments;
    if (target instanceof GenericType) {
      this.genericArguments = this.genericArguments.concat(
        target.genericArguments
      );
      target = target.applyGeneric(genericParameters, loc);
    }
    try {
      super.assertParameters(parameters, loc);
      const realTarget = target.constraint || target;
      if (!(realTarget instanceof FunctionType)) {
        throw new HegelError("First parameter should be an function type", loc);
      }
      return realTarget.returnType;
    } finally {
      this.genericArguments = oldGenericArguments;
    }
  }
}
