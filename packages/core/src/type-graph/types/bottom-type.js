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
    let includedUndefined = false;
    let includedBottom = false;
    const appliedParameters = this.genericArguments.map(argument => {
      if (argument instanceof $BottomType) {
        const newType = argument.changeAll(sourceTypes, targetTypes, typeScope);
        includedBottom = true;
        return newType !== argument ? newType : undefined;
      }
      if (argument instanceof TypeVar) {
        const argumentIndex = sourceTypes.findIndex(
          a =>
            argument instanceof $BottomType
              ? argument.subordinateType === a
              : a === argument
        );
        const result =
          argumentIndex === -1 ? undefined : targetTypes[argumentIndex];
        if (result === undefined) {
          includedUndefined = true;
        }
        return result;
      }
      return argument;
    });
    const includedSubordinate = sourceTypes.find(
      t =>
        this.subordinateMagicType === t ||
        (this.subordinateMagicType instanceof TypeVar &&
          this.subordinateMagicType.root === t)
    );
    if (includedUndefined) {
      const type = this.subordinateMagicType.changeAll(
        sourceTypes,
        targetTypes,
        typeScope
      );
      return new $BottomType(type, type.genericArguments, this.loc);
    }
    if (includedBottom) {
      return new $BottomType(
        this.subordinateMagicType,
        appliedParameters,
        this.loc
      );
    }
    if (includedSubordinate !== null) {
      const type = this.subordinateMagicType.changeAll(
        sourceTypes,
        targetTypes,
        typeScope
      );
      return type;
    }
    const target =
      this.subordinateMagicType instanceof TypeVar &&
      this.subordinateMagicType.root != undefined
        ? this.subordinateMagicType.root
        : this.subordinateMagicType;
    return target.applyGeneric(appliedParameters, this.loc);
  }

  unpack() {
    const target =
      this.subordinateMagicType instanceof TypeVar &&
      this.subordinateMagicType.root != undefined
        ? this.subordinateMagicType.root
        : this.subordinateMagicType;
    if (target instanceof GenericType) {
      return target.applyGeneric(
        this.genericArguments.map(
          a => (a instanceof TypeVar && a.root != undefined ? a.root : a)
        ),
        this.loc,
        true,
        true
      );
    }
    throw new Error("Never!!!");
  }

  isPrincipalTypeFor(other: Type): boolean {
    const self = this.unpack();
    return self.isPrincipalTypeFor(other);
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
