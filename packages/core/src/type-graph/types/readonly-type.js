import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

class $AppliedReadonly extends Type {
  readonly: Type;

  constructor(name, meta = {}, type) {
    super(name, meta);
    this.type = type;
  }
}

export class $Readonly extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$Readonly",
      meta,
      [TypeVar.term("target", { parent })],
      parent,
      null
    );
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
    return $AppliedReadonly.term(
      `$ReadOnly<${String(target.name)}>`,
      { paremt: target.parent },
      target
    );
  }
}
