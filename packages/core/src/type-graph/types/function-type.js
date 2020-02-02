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
      parent: meta.parent || type.parent
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
    if (sourceTypes.every(type => !this.canContain(type))) {
      return this;
    }
    if (this._alreadyProcessedWith !== null) {
      return this._alreadyProcessedWith;
    }
    this._alreadyProcessedWith = TypeVar.createSelf(this.name, this.parent);
    try {
      const newType = this.type.changeAll(sourceTypes, targetTypes, typeScope);
      if (this.type === newType) {
        this._alreadyProcessedWith = null;
        return this;
      }
      return this.endChanges(new RestArgument(newType));
    } catch (e) {
      this._alreadyProcessedWith = null;
      throw e;
    }
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

  contains(type: Type) {
    return this.type.contains(type);
  }

  weakContains(type: Type) {
    return this.type.weakContains(type);
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    const selfType = this.getOponentType(this.type);
    // $FlowIssue
    return selfType.valueType.getDifference(type, withReverseUnion);
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
    genericParams: Array<TypeVar> = [],
    isAsync: boolean = false,
    throws?: Type | void
  ) {
    const asyncPart = this.getAsyncPart(isAsync);
    const genericPart = this.getGenericPart(
      genericParams,
      this.prettyMode && genericParams.length >= 4
    );
    const argsPart = this.getArgumentsPart(
      params,
      this.prettyMode &&
        (params.length >= 4 ||
          (params.some(param => String(param.name).includes("\n")) &&
            params.length !== 1))
    );
    const throwsPart = this.getThrowsPart(throws);
    const returnPart = this.getReturnPart(returnType);
    return this.prettyMode
      ? this.multyLine(asyncPart, genericPart, argsPart, throwsPart, returnPart)
      : this.oneLine(asyncPart, genericPart, argsPart, throwsPart, returnPart);
  }

  static oneLine(
    asyncPart: string,
    genericPart: string,
    argsPart: string,
    throwsPart: string,
    returnPart: string
  ) {
    return `${asyncPart}${genericPart}${argsPart} => ${returnPart}${throwsPart}`;
  }

  static multyLine(
    asyncPart: string,
    genericPart: string,
    argsPart: string,
    throwsPart: string,
    returnPart: string
  ) {
    return `${asyncPart}${genericPart}${argsPart} => ${returnPart.replace(
      /\n/g,
      "\n\t"
    )}${throwsPart}`;
  }

  static getAsyncPart(isAsync: boolean) {
    return isAsync ? "async " : "";
  }

  static getGenericPart(
    genericParams: Array<TypeVar> = [],
    isMultyLine: boolean = false
  ) {
    return genericParams.length === 0
      ? ""
      : `<${genericParams.reduce(
          (res, t) =>
            `${res}${res ? `,${isMultyLine ? "\n\t" : " "}` : ""}${String(
              t.name
            )}${t.constraint ? `: ${String(t.constraint.name)}` : ""}`,
          ""
        )}>`;
  }

  static getArgumentsPart(
    args: Array<Type> = [],
    isMultyLine: boolean = false
  ) {
    return `(${isMultyLine ? "\n\t" : ""}${args
      .map(param => {
        const isRest = param instanceof RestArgument;
        // $FlowIssue
        param = Type.getTypeRoot(isRest ? param.type : param);
        const t = String(param.name);
        const name = isRest ? `...${t} ` : t;
        return isMultyLine ? name.replace(/\n/g, "\n\t") : name;
      })
      .join(isMultyLine ? ",\n\t" : ", ")}${isMultyLine ? "\n" : ""})`;
  }

  static getThrowsPart(throws: Type | void) {
    return throws !== undefined ? ` throws ${String(throws.name)}` : "";
  }

  static getReturnPart(returnType: Type) {
    return String(returnType.name);
  }

  argumentsTypes: Array<Type | RestArgument>;
  returnType: Type;
  throwable: Type | void;
  isAsync: boolean;
  priority = 2;

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
    if (sourceTypes.every(type => !this.canContain(type))) {
      return this;
    }
    if (this._alreadyProcessedWith !== null) {
      return this._alreadyProcessedWith;
    }
    this._alreadyProcessedWith = TypeVar.createSelf(
      this.getChangedName(sourceTypes, targetTypes),
      this.parent
    );
    let isArgumentsChanged = false;
    try {
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
        this._alreadyProcessedWith = null;
        return this;
      }
      const result = FunctionType.term(
        FunctionType.getName(newArguments, newReturn, undefined, this.isAsync),
        {},
        newArguments,
        newReturn
      );
      result.isAsync = this.isAsync;
      return this.endChanges(result);
    } catch (e) {
      this._alreadyProcessedWith = null;
      throw e;
    }
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    const result =
      anotherType instanceof FunctionType &&
      super.equalsTo(anotherType) &&
      this.canContain(anotherType) &&
      this.returnType.equalsTo(anotherType.returnType) &&
      this.argumentsTypes.length === anotherType.argumentsTypes.length &&
      this.argumentsTypes.every((arg, i) =>
        // $FlowIssue
        arg.equalsTo(anotherType.argumentsTypes[i])
      );
    this._alreadyProcessedWith = null;
    return result;
  }

  isSuperTypeFor(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    if (!(anotherType instanceof FunctionType)) {
      anotherType = anotherType.getPropertyType(CALLABLE);
      if (anotherType === null) {
        this._alreadyProcessedWith = null;
        return false;
      }
    }
    const result =
      this.returnType.isPrincipalTypeFor(anotherType.returnType) &&
      this.argumentsTypes.length >= anotherType.argumentsTypes.length &&
      anotherType.argumentsTypes.every((arg, i) =>
        arg.isPrincipalTypeFor(this.argumentsTypes[i] || Type.Undefined)
      );
    this._alreadyProcessedWith = null;
    return result;
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    if (this._alreadyProcessedWith === type || this.referenceEqualsTo(type)) {
      return [];
    }
    this._alreadyProcessedWith = type;
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
      const argumentsDiff = this.argumentsTypes.flatMap(
        (arg, i) =>
          argumentsTypes[i]
            ? arg.getDifference(argumentsTypes[i], withReverseUnion)
            : []
      );
      const returnDiff = this.returnType.getDifference(
        returnType,
        withReverseUnion
      );
      this._alreadyProcessedWith = null;
      return argumentsDiff.concat(returnDiff);
    }
    const result = super.getDifference(type, withReverseUnion);
    this._alreadyProcessedWith = null;
    return result;
  }

  contains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.contains(type) ||
      this.argumentsTypes.some(a => a.contains(type)) ||
      this.returnType.contains(type);
    this._alreadyProcessedWith = null;
    return result;
  }

  weakContains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.weakContains(type) ||
      this.argumentsTypes.some(a => a.weakContains(type)) ||
      this.returnType.weakContains(type);
    this._alreadyProcessedWith = null;
    return result;
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

  getNextParent(typeScope: TypeScope) {
    if (this._alreadyProcessedWith !== null) {
      return Type.GlobalTypeScope;
    }
    this._alreadyProcessedWith = this;
    const sortedParents = this.argumentsTypes
      .concat([this.returnType])
      .map(a => a.getNextParent(typeScope))
      .sort((a, b) => b.priority - a.priority);
    for (const parent of sortedParents) {
      if (parent.priority <= typeScope.priority && parent !== typeScope) {
        this._alreadyProcessedWith = null;
        return parent;
      }
    }
    this._alreadyProcessedWith = null;
    return Type.GlobalTypeScope;
  }
}
