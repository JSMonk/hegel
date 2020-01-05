import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { FunctionType } from "./function-type";
import { getNameForType } from "../../utils/type-utils";

export class $BottomType extends Type {
  static getName(name, parameters) {
    if (parameters.length === 0) {
      return String(name);
    }
    return `${String(name)}<${parameters.reduce(
      (res, t) => `${res}${res ? ", " : ""}${getNameForType(t)}`,
      ""
    )}>`;
  }

  constructor(subordinateMagicType, genericArguments = [], loc) {
    super($BottomType.getName(subordinateMagicType.name, genericArguments));
    this.subordinateMagicType = subordinateMagicType;
    this.genericArguments = genericArguments;
    this.loc = loc;
  }

  changeAll(sourceTypes, targetTypes, typeScope) {
    let includedUndefined = false;
    let includedBottom = false;
    const includedSelfIndex = sourceTypes.findIndex(t => this.equalsTo(t));
    if (includedSelfIndex !== -1) {
      return targetTypes[includedSelfIndex];
    }
    const mapper = argument => {
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
    };
    const appliedParameters = this.genericArguments.map(argument => {
      if (argument instanceof UnionType) {
        const result = argument.variants.map(mapper);
        return result.find(a => a !== undefined);
      }
      return mapper(argument);
    });
    if (appliedParameters.every(a => a === undefined)) {
      return this;
    }
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
        ? Type.getTypeRoot(this.subordinateMagicType)
        : this.subordinateMagicType;
    if ("subordinateType" in target) {
      return target.applyGeneric(
        this.genericArguments.map(
          a => (a instanceof TypeVar && a.root != undefined ? a.root : a)
        ),
        this.loc,
        true,
        true
      );
    }
    throw new Error(`Never!!! ${target.constructor.name}`);
  }

  isPrincipalTypeFor(other: Type): boolean {
    const self = this.unpack();
    return self.isPrincipalTypeFor(other);
  }

  applyGeneric(parameters, loc, shouldBeMemoize, isCalledAsBottom, ...args) {
    const returnType = parameters.some(
      p => p instanceof TypeVar && p.isUserDefined
    )
      ? new $BottomType(this.subordinateMagicType, parameters, loc)
      : this.subordinateMagicType.applyGeneric(
          parameters,
          loc,
          shouldBeMemoize,
          true,
          ...args
        );
    return new FunctionType(
      this.subordinateMagicType.name,
      this.subordinateMagicType.genericArguments,
      returnType
    );
  }

  getDifference(type: Type) {
    if (type instanceof $BottomType) {
      type = type.subordinateMaigcType;
    }
    return this.subordinateMagicType.getDifference(type);
  }

  getRootedSubordinateType() {
    const { subordinateMagicType } = this;
    if ("subordinateType" in subordinateMagicType) {
      subordinateMagicType.genericArguments.forEach((arg, index) => {
        arg.root = this.genericArguments[index];
      });
    }
    return subordinateMagicType;
  }

  unrootSubordinateType() {
    const { subordinateMagicType } = this;
    if ("subordinateType" in subordinateMagicType) {
      subordinateMagicType.genericArguments.forEach((arg, index) => {
        arg.root = undefined;
      });
    }
  }

  equalsTo(type: Type) {
    return (
      type instanceof $BottomType &&
      this.genericArguments.every((arg, i) =>
        arg.equalsTo(type.genericArguments[i])
      ) &&
      Type.getTypeRoot(this.subordinateMagicType) ===
        Type.getTypeRoot(type.subordinateMagicType)
    );
  }

  contains(type: Type) {
    return this.subordinateMagicType.contains(type);
  }

  weakContains(type: Type) {
    return this.subordinateMagicType.weakContains(type);
  }

  makeNominal() {
    this.subordinateMagicType.makeNominal();
  }
}
