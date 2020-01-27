import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

export class $ThrowsResult extends Type {
  constructor(name, meta = {}, resultType, errorType) {
    super(name, meta);
    this.resultType = resultType;
    this.errorType = errorType;
  }
}

export class $Throws extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$Throws",
      meta,
      [TypeVar.term("result", { parent }), TypeVar.term("errors", { parent })],
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
    super.assertParameters(parameters, loc);
    const [result, error] = parameters;
    return $ThrowsResult.term(
      `$Throws<${String(result.name)}, ${String(error.name)}>`,
      { parent: result.parent },
      result,
      error
    );
  }
}
