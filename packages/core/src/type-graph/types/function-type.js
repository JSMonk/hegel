// @flow
import { Type } from "./type";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeVar } from "./type-var";

export class FunctionType extends Type {
  static createTypeWithName = createTypeWithName(FunctionType);

  static getName(
    params: Array<Type>,
    returnType: Type,
    genericParams: Array<TypeVar> = []
  ) {
    const genericPart = genericParams.length
      ? `<${genericParams.reduce(
          (res, t) =>
            `${res}${res ? ", " : ""}${getNameForType(t)}${
              t.constraint ? `: ${getNameForType(t.constraint)}` : ""
            }`,
          ""
        )}>`
      : "";
    return `${genericPart}(${params
      .map(getNameForType)
      .join(", ")}) => ${getNameForType(returnType)}`;
  }

  argumentsTypes: Array<Type>;
  returnType: Type;

  constructor(name: string, argumentsTypes: Array<Type>, returnType: Type) {
    super(name);
    this.argumentsTypes = argumentsTypes;
    this.returnType = returnType;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ): Type {
    let isArgumentsChanged = false;
    const newArguments = this.argumentsTypes.map(t => {
      const newT = t.changeAll(sourceTypes, targetTypes, typeScope);
      if (newT === t) {
        return t;
      }
      isArgumentsChanged = true;
      return newT;
    });
    const newReturn = this.returnType.changeAll(
      sourceTypes,
      targetTypes,
      typeScope
    );
    if (newReturn === this.returnType && !isArgumentsChanged) {
      return this;
    }
    return FunctionType.createTypeWithName(
      FunctionType.getName(newArguments, newReturn),
      typeScope,
      newArguments,
      newReturn
    );
  }

  equalsTo(anotherType: Type) {
    const argumentsTypes =
      anotherType instanceof FunctionType ? anotherType.argumentsTypes : [];
    return (
      anotherType instanceof FunctionType &&
      super.equalsTo(anotherType) &&
      this.returnType.equalsTo(anotherType.returnType) &&
      this.argumentsTypes.length === argumentsTypes.length &&
      this.argumentsTypes.every((type, index) =>
        type.equalsTo(argumentsTypes[index])
      )
    );
  }

  isSuperTypeFor(anotherType: Type): boolean {
    const argumentsTypes =
      anotherType instanceof FunctionType ? anotherType.argumentsTypes : [];
    return (
      anotherType instanceof FunctionType &&
      this.returnType.isPrincipalTypeFor(anotherType.returnType) &&
      this.argumentsTypes.every((type, index) =>
        (argumentsTypes[index] || new Type("void")).isPrincipalTypeFor(type)
      )
    );
  }
}
