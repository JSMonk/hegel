import { Type } from "./type";
import { TypeVar } from "./type-var";
import { GenericType } from "./generic-type";
import { FunctionType } from "./function-type";

export class $BottomType extends Type {
  constructor(subordinateMagicType, genericArguments = [], loc) {
    super(GenericType.getName(subordinateMagicType.name, genericArguments));
    this.subordinateMagicType = subordinateMagicType;
    this.genericArguments = genericArguments;
    this.loc = loc;
  }

  changeAll(sourceTypes, targetTypes, typeScope) {
    const appliedParameters = this.genericArguments.map(argument => {
      if (argument instanceof TypeVar) {
        const argumentIndex = sourceTypes.findIndex(t => t === argument);
        return targetTypes[argumentIndex];
      }
      return argument;
    });
    return this.subordinateMagicType.applyGeneric(appliedParameters, this.loc);
  }

  applyGeneric(parameters, loc, shouldBeMemoize) {
    const returnType = parameters.some(
      p => p instanceof TypeVar && p.isUserDefined
    )
      ? new $BottomType(this.subordinateMagicType, parameters, loc)
      : this.subordinateMagicType.applyGeneric(
          parameters,
          loc,
          shouldBeMemoize,
          true
        );
    return new FunctionType(
      this.subordinateMagicType.name,
      this.subordinateMagicType.genericArguments,
      returnType
    );
  }
}
