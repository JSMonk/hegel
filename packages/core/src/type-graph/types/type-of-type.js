import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

export class $TypeOf extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$TypeOf",
      {},
      [TypeVar.term("target", { parent })],
      parent,
      null,
      meta
    );
  }

  applyGeneric(parameters, loc) {
    super.assertParameters(parameters, loc);
    const [target] = parameters;
    return target.type;
  }
}
