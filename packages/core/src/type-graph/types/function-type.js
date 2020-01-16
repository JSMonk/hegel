// @flow
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { CALLABLE } from "../constants";
import { GenericType } from "./generic-type";
import type { TypeMeta } from "./type";

export class RestArgument extends Type {
  static term(
    name: mixed,
    meta?: TypeMeta = {},
    type: Type,
    ...args: Array<any>
  ) {
    const newMeta = {
      ...meta,
      parent: TypeVar.isSelf(type) ? meta.parent : type.parent
    };
    return super.term(name, newMeta, type, ...args);
  }

  type: Type;

  constructor(type: Type) {
    super(`...${String(type.name)}`);
    this.type = type;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
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
    if (!("valueType" in selfType && "valueType" in otherType)) {
      return false;
    }
    // $FlowIssue
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
  static Function = new TypeVar("Function");

  static term(
    name: mixed,
    meta?: TypeMeta = {},
    argumentsTypes: Array<Type>,
    returnType: Type,
    ...args: Array<any>
  ) {
    let parent: TypeScope | void = meta.parent;
    const searchingItems = argumentsTypes.concat([returnType]);
    const length = searchingItems.length;
    for (let i = 0; i < length; i++) {
      const item = searchingItems[i];
      if (
        item instanceof Type &&
        !TypeVar.isSelf(item) &&
        (parent === undefined || parent.priority < item.parent.priority)
      ) {
        parent = item.parent;
      }
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, argumentsTypes, returnType, ...args);
  }

  static getName(
    params: Array<Type | RestArgument>,
    returnType: Type,
    genericParams: Array<TypeVar> = []
  ) {
    const genericPart = genericParams.length
      ? `<${genericParams.reduce(
          (res, t) =>
            `${res}${res ? ", " : ""}${String(t.name)}${
              t.constraint ? `: ${String(t.constraint.name)}` : ""
            }`,
          ""
        )}>`
      : "";
    const args = params
      .map(param => {
        const isRest = param instanceof RestArgument;
        // $FlowIssue
        const t = String(isRest ? param.type.name : param.name);
        return isRest ? `...${t} ` : t;
      })
      .join(", ");
    return `${genericPart}(${args}) => ${String(returnType.name)}`;
  }

  argumentsTypes: Array<Type | RestArgument>;
  returnType: Type;
  throwable: ?Type;
  isAsync: boolean;

  constructor(
    name: string,
    typeMeta: TypeMeta = {},
    argumentsTypes: Array<Type | RestArgument>,
    returnType: Type,
    isAsync?: boolean = false
  ) {
    super(name, { isSubtypeOf: FunctionType.Function, ...typeMeta });
    this.argumentsTypes = argumentsTypes;
    this.returnType = returnType;
    this.isAsync = isAsync;
  }

  changeAll(
    sourceTypes: Array<Type | RestArgument>,
    targetTypes: Array<Type | RestArgument>,
    typeScope: TypeScope
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

    return FunctionType.term(
      FunctionType.getName(newArguments, newReturn),
      {},
      newArguments,
      newReturn
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
      anotherType = anotherType.getPropertyType(CALLABLE);
      if (anotherType === null) {
        return false;
      }
    }
    return (
      this.returnType.isPrincipalTypeFor(anotherType.returnType) &&
      this.argumentsTypes.length >= anotherType.argumentsTypes.length &&
      anotherType.argumentsTypes.every((arg, i) =>
        arg.isPrincipalTypeFor(this.argumentsTypes[i] || Type.Undefined)
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

  generalize(types: Array<TypeVar>, typeScope: TypeScope) {
    const localTypeScope = new TypeScope(typeScope);
    const newArguments = this.argumentsTypes.map(arg =>
      arg.generalize(types, localTypeScope)
    );
    const newReturnType = this.returnType.generalize(types, localTypeScope);
    const maybeGenericTypes = newArguments.concat(newReturnType);
    const newGenericArguments = types.filter(type =>
      maybeGenericTypes.some(
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
    const newFnType = FunctionType.term(
      fnName,
      {},
      newArguments,
      newReturnType
    );
    if (newGenericArguments.length === 0) {
      return newFnType;
    }
    return GenericType.new(
      fnName,
      { parent: typeScope },
      newGenericArguments,
      localTypeScope,
      newFnType
    );
  }
}
