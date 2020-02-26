import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

export class $ThrowsResult extends Type {
  static get name() {
    return "$ThrowsResult";
  }

  constructor(name, meta = {}, errorType) {
    name = name === null ? `$Throws<${String(errorType).name}>` : name;
    super(name, meta);
    this.errorType = errorType;
  }
}

export class $Throws extends GenericType {
  static get name() {
    return "$Throws";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("$Throws", meta, [TypeVar.term("errors", { parent })], parent, null);
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
    const [error] = parameters;
    return $ThrowsResult.term(null, { parent: error.parent }, error);
  }
}
