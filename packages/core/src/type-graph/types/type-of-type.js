import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

export class $TypeOf extends GenericType {
  static get name() {
    return "$TypeOf";
  }

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
    return target.type;
  }
}
