import { Type } from "./type";
import { FunctionType } from "./function-type";

export class $BottomType extends Type {
  constructor(subordinateMagicType) {
    super("$BottomType");
    this.subordinateMagicType = subordinateMagicType;
  }

  applyGeneric(parameters, loc, shouldBeMemoize) {
    return new FunctionType(
      "_|_",
      this.subordinateMagicType.genericArguments,
      this.subordinateMagicType.applyGeneric(parameters, loc, shouldBeMemoize, true)
    );
  }
}
