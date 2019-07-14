// @flow
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { Meta } from "../type-graph/meta/meta";
import { Scope } from "../type-graph/scope";
import { TypeVar } from "../type-graph/types/type-var";
import { CallMeta } from "../type-graph/meta/call-meta";
import { UnionType } from "../type-graph/types/union-type";
import { addTypeVar } from "../utils/type-utils";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { UNDEFINED_TYPE } from "../type-graph/constants";
import { getVariableType } from "../utils/variable-utils";
import { addCallToTypeGraph } from "../type-graph/call";
import {
  copyTypeInScopeIfNeeded,
  getTypeFromTypeAnnotation
} from "../utils/type-utils";
import type { Function, SourceLocation } from "@babel/parser";
import type {
  CallableTarget,
  CallableType
} from "../type-graph/meta/call-meta";

type GenericFunctionScope = {
  calls: Array<CallMeta>,
  type: "function",
  body: $PropertyType<Scope, "body">,
  declaration: {
    type: GenericType<FunctionType>
  }
};

const typeVarNames = [
  "α",
  "β",
  "γ",
  "δ",
  "ε",
  "ζ",
  "η",
  "θ",
  "ι",
  "κ",
  "λ",
  "μ",
  "ν",
  "ξ",
  "ρ",
  "τ"
];

export function inferenceFunctionLiteralType(
  currentNode: Function,
  typeScope: Scope,
  parentNode: ModuleScope | Scope,
  typeGraph: ModuleScope
): CallableType {
  let shouldBeGeneric =
    currentNode.typeParameters !== undefined ||
    currentNode.returnType === undefined;
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  const functionScope = typeGraph.body.get(Scope.getName(currentNode));
  if (!(functionScope instanceof Scope)) {
    throw new Error("Function scope should be created before inference");
  }
  const genericArguments: Array<TypeVar> = [];
  if (currentNode.typeParameters) {
    currentNode.typeParameters.params.forEach(typeAnnotation =>
      genericArguments.push(
        (getTypeFromTypeAnnotation(
          { typeAnnotation },
          localTypeScope,
          parentNode
        ): any)
      )
    );
  }
  const argumentsTypes = currentNode.params.map((param, index) => {
    if (param.optional) {
      throw new HegelError(
        "The optional argument syntax is not allowed. Please use maybe type syntax.",
        param.loc
      );
    }
    const { name } = param.left || param;
    const typeAnnotation =
      param.left !== undefined
        ? param.left.typeAnnotation
        : param.typeAnnotation;
    let paramType = getTypeFromTypeAnnotation(
      typeAnnotation,
      localTypeScope,
      parentNode,
      false
    );
    const isWithoutAnnotation = paramType.name === UNDEFINED_TYPE;
    functionScope.body.set(
      name,
      new VariableInfo(paramType, localTypeScope, new Meta(param.loc))
    );
    if (param.left !== undefined) {
      const callResultType = addCallToTypeGraph(
        param,
        typeGraph,
        functionScope
      );
      const newType =
        callResultType.result instanceof VariableInfo
          ? callResultType.result.type
          : callResultType.result;
      paramType = !isWithoutAnnotation
        ? paramType
        : getVariableType(
            undefined,
            newType,
            typeScope,
            callResultType.inferenced
          );
      const variants = [
        paramType,
        Type.createTypeWithName("undefined", localTypeScope)
      ];
      paramType = !isWithoutAnnotation
        ? paramType
        : UnionType.createTypeWithName(
            UnionType.getName(variants),
            localTypeScope,
            variants
          );
    }
    if (paramType.name === UNDEFINED_TYPE) {
      shouldBeGeneric = true;
      const typeVar = addTypeVar(typeVarNames[index], localTypeScope);
      genericArguments.push(typeVar);
      return typeVar;
    }
    return paramType;
  });
  const returnType = currentNode.returnType
    ? (getTypeFromTypeAnnotation(
        currentNode.returnType,
        localTypeScope,
        parentNode,
        false
      ): any)
    : addTypeVar(typeVarNames[argumentsTypes.length], localTypeScope);
  if (!currentNode.returnType) {
    genericArguments.push(returnType);
  }
  const typeName = FunctionType.getName(
    argumentsTypes,
    returnType,
    shouldBeGeneric ? genericArguments : []
  );
  const type = FunctionType.createTypeWithName(
    typeName,
    typeScope,
    argumentsTypes,
    returnType
  );
  return shouldBeGeneric
    ? GenericType.createTypeWithName(
        typeName,
        typeScope,
        genericArguments,
        localTypeScope,
        type
      )
    : type;
}

function getCallTarget(call: CallMeta): FunctionType {
  let callTargetType = call.target.type || call.target;
  if (callTargetType instanceof GenericType) {
    callTargetType = getRawFunctionType(callTargetType, call.arguments);
  }
  return (callTargetType: any);
}

const isArgumentVariable = x => {
  const type = x instanceof VariableInfo ? x.type : x;
  return type instanceof TypeVar;
};

function resolveOuterTypeVarsFromCall(
  call: CallMeta,
  typeScope: Scope,
  typeGraph: ModuleScope
) {
  if (!call.arguments.some(isArgumentVariable)) {
    return;
  }
  const callTarget: FunctionType = getCallTarget(call);

  const newArguments = [];
  for (let i = 0; i < call.arguments.length; i++) {
    const callArgumentType =
      call.arguments[i] instanceof VariableInfo
        ? call.arguments[i].type
        : call.arguments[i];
    const callTargetType = copyTypeInScopeIfNeeded(
      callTarget.argumentsTypes[i],
      typeScope
    );
    if (
      !(callArgumentType instanceof TypeVar) ||
      callArgumentType.isUserDefined ||
      callArgumentType === callTargetType
    ) {
      newArguments.push(callTargetType);
      continue;
    }
    if (
      callArgumentType.root !== undefined &&
      !(callArgumentType.root instanceof TypeVar)
    ) {
      newArguments.push(callArgumentType.root);
      continue;
    }
    if (
      callTarget.argumentsTypes[i] instanceof TypeVar &&
      callTarget.argumentsTypes[i].constraint === undefined
    ) {
      newArguments.push(call.arguments[i]);
      continue;
    }
    newArguments.push(callTargetType);
    callArgumentType.root = callTargetType;
  }
}

export function implicitApplyGeneric(
  fn: GenericType<FunctionType>,
  argumentsTypes: Array<Type>,
  loc: SourceLocation
): FunctionType {
  const genericArguments = argumentsTypes.reduce((res, t, i) => {
    const argumentType = fn.subordinateType.argumentsTypes[i];
    const existed = res[String(argumentType.name)];
    if (
      argumentType instanceof TypeVar &&
      t.name !== UNDEFINED_TYPE &&
      (existed === undefined || existed instanceof TypeVar)
    ) {
      return Object.assign(res, { [String(argumentType.name)]: t });
    }
    return res;
  }, {});
  return fn.applyGeneric(
    fn.genericArguments.map(t => genericArguments[String(t.name)] || t),
    loc
  );
}

export function getRawFunctionType(
  fn: FunctionType | GenericType<FunctionType>,
  args: Array<Type | VariableInfo>,
  genericArguments?: Array<Type>,
  loc: SourceLocation
) {
  if (fn instanceof FunctionType) {
    return fn;
  }
  const argumentsTypes = args.map(arg =>
    arg instanceof VariableInfo ? arg.type : arg
  );
  return genericArguments
    ? fn.applyGeneric(genericArguments, loc)
    : implicitApplyGeneric(fn, argumentsTypes, loc);
}

export function getInvocationType(
  fn: FunctionType | GenericType<FunctionType>,
  argumentsTypes: Array<Type | VariableInfo>,
  genericArguments?: Array<Type>,
  loc: SourceLocation
): Type {
  if (fn instanceof FunctionType) {
    return fn.returnType;
  }
  const resultFn = getRawFunctionType(fn, argumentsTypes, genericArguments);
  return resultFn.returnType;
}

export function getTypeRoot(type: TypeVar) {
  if (type.root == undefined) {
    return type;
  }
  let potentialRoot = type.root;
  while (potentialRoot instanceof TypeVar && potentialRoot.root != undefined) {
    potentialRoot = potentialRoot.root;
  }
  return potentialRoot;
}

export function inferenceFunctionTypeByScope(
  functionScope: GenericFunctionScope,
  typeGraph: ModuleScope
) {
  const { calls = [] } = functionScope;
  const {
    genericArguments,
    localTypeScope,
    subordinateType: { argumentsTypes, returnType }
  } = functionScope.declaration.type;
  let returnWasCalled = false;
  for (let i = 0; i < calls.length; i++) {
    resolveOuterTypeVarsFromCall(calls[i], localTypeScope, typeGraph);
  }
  for (const [_, v] of functionScope.body) {
    if (v.type instanceof TypeVar && v.type.root != undefined) {
      // $FlowIssue
      v.type = getTypeRoot(v.type);
    }
  }
  for (let i = 0; i < calls.length; i++) {
    if (
      calls[i].targetName === "return" &&
      returnType instanceof TypeVar &&
      !returnType.isUserDefined
    ) {
      const [returnArgument] = calls[i].arguments;
      returnType.root =
        returnArgument instanceof VariableInfo
          ? returnArgument.type
          : returnArgument;
      returnWasCalled = true;
    }
  }
  if (
    !returnWasCalled &&
    returnType instanceof TypeVar &&
    !returnType.isUserDefined
  ) {
    returnType.root = Type.createTypeWithName("void", localTypeScope);
  }
  const newArgumentsTypes = argumentsTypes.map(t =>
    t instanceof TypeVar && t.root != undefined ? getTypeRoot(t) : t
  );
  const newGenericArguments: Array<TypeVar> = newArgumentsTypes.reduce(
    (res, t) => {
      const existed = res.find(t1 => t1.name === t.name);
      if (existed !== undefined || !(t instanceof TypeVar)) {
        return res;
      }
      return res.concat([Object.assign(t, { isUserDefined: true })]);
    },
    []
  );
  const newReturnType =
    returnType instanceof TypeVar && returnType.root != undefined
      ? getTypeRoot(returnType)
      : returnType;
  const newFunctionTypeName = FunctionType.getName(
    newArgumentsTypes,
    newReturnType,
    newGenericArguments
  );
  let newFunctionType = FunctionType.createTypeWithName(
    newFunctionTypeName,
    newGenericArguments.length ? localTypeScope : localTypeScope.parent,
    newArgumentsTypes,
    newReturnType
  );
  if (newGenericArguments.length) {
    newFunctionType = GenericType.createTypeWithName(
      newFunctionTypeName,
      localTypeScope.parent,
      newGenericArguments,
      localTypeScope,
      newFunctionType
    );
  }
  functionScope.declaration.type = newFunctionType;
}
