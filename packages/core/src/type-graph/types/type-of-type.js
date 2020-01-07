import { TypeVar } from "./type-var";
import { GenericType } from "./generic-type";

export class $TypeOf extends GenericType {
  constructor() {
    super("$TypeOf", [new TypeVar("target")], null, null);
  }

  applyGeneric(parameters, loc) {
    super.assertParameters(parameters, loc);
    const [target] = parameters;
    return target.type;
  }
}
