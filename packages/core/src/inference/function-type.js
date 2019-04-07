// @flow
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { TypeVar } from "../type-graph/types/type-var";
import { CallMeta } from "../type-graph/meta/call-meta";
import { addTypeVar } from "../utils/type-utils";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { UNDEFINED_TYPE } from "../type-graph/constants";
import { getTypeFromTypeAnnotation } from "../utils/type-utils";
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
  parentNode: ModuleScope | Scope
): CallableType {
  let shouldBeGeneric =
    currentNode.typeParameters !== undefined ||
    currentNode.returnType === undefined;
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
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
    const paramType = getTypeFromTypeAnnotation(
      param.typeAnnotation,
      localTypeScope,
      parentNode,
      false
    );
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

function getCallTarget(callTarget: CallableType) {
  if (callTarget instanceof GenericType) {
    callTarget = callTarget.subordinateType;
  }
  return callTarget;
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
  const callTarget: FunctionType = getCallTarget(
    // $FlowIssue
    call.target.type || call.target
  );

  const newArguments = [];
  for (let i = 0; i < call.arguments.length; i++) {
    const callArgumentType =
      call.arguments[i] instanceof VariableInfo
        ? call.arguments[i].type
        : call.arguments[i];
    if (
      !(callArgumentType instanceof TypeVar) ||
      callArgumentType.isUserDefined
    ) {
      newArguments.push(callArgumentType);
      continue;
    }
    if (callArgumentType.root) {
      newArguments.push(callArgumentType.root);
      continue;
    }
    if (callTarget.argumentsTypes[i] instanceof TypeVar) {
      newArguments.push(call.arguments[i]);
      continue;
    }
    newArguments.push(callTarget.argumentsTypes[i]);
    callArgumentType.root = callTarget.argumentsTypes[i];
  }
}

export function implicitApplyGeneric(
  fn: GenericType<FunctionType>,
  argumentsTypes: Array<Type>,
  loc: SourceLocation
): FunctionType {
  const genericArguments = argumentsTypes.reduce((res, t, i) => {
    const argumentType = fn.subordinateType.argumentsTypes[i];
    if (
      argumentType instanceof TypeVar &&
      !res[String(argumentType.name)] &&
      t.name !== UNDEFINED_TYPE
    ) {
      return Object.assign(res, { [String(argumentType.name)]: t });
    }
    return res;
  }, {});
  return fn.applyGeneric(
    fn.genericArguments.map(t => genericArguments[String(t.name)]),
    loc
  );
}

export function getInvocationType(
  fn: FunctionType | GenericType<FunctionType>,
  argumentsTypes: Array<Type>,
  genericArguments?: Array<Type>,
  loc: SourceLocation
): Type {
  if (fn instanceof FunctionType) {
    return fn.returnType;
  }
  const resultFn = genericArguments
    ? fn.applyGeneric(genericArguments, loc)
    : implicitApplyGeneric(fn, argumentsTypes, loc);
  return resultFn.returnType;
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
  for (const [_, v] of functionScope.body) {
    if (v.type instanceof TypeVar && v.type.root) {
      // $FlowIssue
      v.type = v.type.root;
    }
  }
  // $FlowIssue - Untyped filter method
  const newGenericArguments: Array<TypeVar> = genericArguments.filter(
    t => t instanceof TypeVar && !t.root
  );
  const newArgumentsTypes = argumentsTypes.map(
    t => (t instanceof TypeVar && t.root ? t.root : t)
  );
  const newReturnType =
    returnType instanceof TypeVar && returnType.root
      ? returnType.root
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
