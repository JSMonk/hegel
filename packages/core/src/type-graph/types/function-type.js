// @flow
import { Type } from "./type";
import { Scope } from "../scope";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { getNameForType } from "../../utils/type-utils";
import { CollectionType } from "./collection-type";
import { createTypeWithName } from "./create-type";
import type { TypeVar } from "./type-var";
import type { TypeMeta } from "./type";

const UNDEFINED = new Type("undefined", { isSubtypeOf: new Type("void") });

export class RestArgument extends Type {
  type: Type;

  constructor(type: Type) {
    super(`...${String(type.name)}`);
    this.type = type;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    const newType = this.type.changeAll(sourceTypes, targetTypes, typeScope);
    if (this.type === newType) {
      return this;
    }
    return new RestArgument(newType);
  }

  isType(
    action: "equalsTo" | "isSuperTypeFor",
    anotherType: Type | RestArgument
  ) {
    if (!(anotherType instanceof RestArgument)) {
      return false;
    }
    const selfType = this.getOponentType(this.type, false);
    const otherType = this.getOponentType(anotherType.type, false);
    if (
      !(
        selfType instanceof CollectionType &&
        otherType instanceof CollectionType
      )
    ) {
      return false;
    }
    return selfType.valueType[action](otherType.valueType);
  }

  equalsTo(anotherType: Type | RestArgument) {
    return this.isType("equalsTo", anotherType);
  }

  isSuperTypeFor(anotherType: Type | RestArgument) {
    return this.isType("isSuperTypeFor", anotherType);
  }
}

export class FunctionType extends Type {
  static createTypeWithName = createTypeWithName(FunctionType);

  static getName(
    params: Array<Type | RestArgument>,
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
    const args = params
      .map(param => {
        const isRest = param instanceof RestArgument;
        // $FlowIssue
        const t = getNameForType(isRest ? param.type : param);
        return isRest ? `...${t} ` : t;
      })
      .join(", ");
    return `${genericPart}(${args}) => ${getNameForType(returnType)}`;
  }

  argumentsTypes: Array<Type | RestArgument>;
  returnType: Type;
  throwable: ?Type;

  constructor(
    name: string,
    argumentsTypes: Array<Type | RestArgument>,
    returnType: Type,
    typeMeta: TypeMeta = { isSubtypeOf: new ObjectType("Function", []) }
  ) {
    super(name, typeMeta);
    this.argumentsTypes = argumentsTypes;
    this.returnType = returnType;
  }

  changeAll(
    sourceTypes: Array<Type | RestArgument>,
    targetTypes: Array<Type | RestArgument>,
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
    const isSubtypeOf =
      this.isSubtypeOf &&
      this.isSubtypeOf.changeAll(sourceTypes, targetTypes, typeScope);
    if (
      newReturn === this.returnType &&
      isSubtypeOf === this.isSubtypeOf &&
      !isArgumentsChanged
    ) {
      return this;
    }

    return new FunctionType(
      FunctionType.getName(newArguments, newReturn),
      newArguments,
      newReturn,
      { isSubtypeOf }
    );
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }
    if (!(anotherType instanceof FunctionType)) {
      return false;
    }
    return (
      super.equalsTo(anotherType) &&
      this.returnType.equalsTo(anotherType.returnType) &&
      this.argumentsTypes.length === anotherType.argumentsTypes.length &&
      this.argumentsTypes.every((arg, i) =>
        // $FlowIssue
        arg.equalsTo(anotherType.argumentsTypes[i])
      )
    );
  }

  isSuperTypeFor(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (!(anotherType instanceof FunctionType)) {
      return false;
    }
    return (
      this.returnType.isPrincipalTypeFor(anotherType.returnType) &&
      this.argumentsTypes.length >= anotherType.argumentsTypes.length &&
      anotherType.argumentsTypes.every((arg, i) =>
        arg.isPrincipalTypeFor(this.argumentsTypes[i] || UNDEFINED)
      )
    );
  }

  getDifference(type: Type) {
    if (
      "subordinateType" in type &&
      // $FlowIssue
      type.subordinateType instanceof FunctionType
    ) {
      type = type.subordinateType;
    }
    if (type instanceof FunctionType) {
      const { argumentsTypes, returnType } = type;
      // $FlowIssue
      const argumentsDiff = this.argumentsTypes.flatMap((arg, i) =>
        arg.getDifference(argumentsTypes[i])
      );
      const returnDiff = this.returnType.getDifference(returnType);
      return argumentsDiff.concat(returnDiff);
    }
    return super.getDifference(type);
  }

  contains(type: Type) {
    return (
      super.contains(type) ||
      this.argumentsTypes.some(a => a.contains(type)) ||
      this.returnType.contains(type)
    );
  }

  weakContains(type: Type) {
    return (
      super.weakContains(type) ||
      this.argumentsTypes.some(a => a.weakContains(type)) ||
      this.returnType.weakContains(type)
    );
  }

  generalize(types: Array<TypeVar>, typeScope: Scope) {
    const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
    const newArguments = this.argumentsTypes.map(arg =>
      arg.generalize(types, localTypeScope)
    );
    const newReturnType = this.returnType.generalize(types, localTypeScope);
    const newGenericArguments = types.filter(type =>
      newArguments.some(
        arg => arg.weakContains(type) && !arg.containsAsGeneric(type)
      )
    );
    if (
      this.argumentsTypes.every((arg, i) => arg === newArguments[i]) &&
      this.returnType === newReturnType &&
      newGenericArguments.length === 0
    ) {
      return this;
    }
    const fnName = FunctionType.getName(
      newArguments,
      newReturnType,
      newGenericArguments
    );
    const newFnType = new FunctionType(fnName, newArguments, newReturnType);
    if (newGenericArguments.length === 0) {
      return newFnType;
    }
    return new GenericType(
      fnName,
      newGenericArguments,
      localTypeScope,
      newFnType
    );
  }
}
