// @flow
import type {
  Node,
  ArrayExpression,
  ObjectExpression,
  Function
} from "@babel/parser";
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { addFunctionScopeToTypeGraph } from "../type/type-graph";
import {
  addTypeVar,
  getScopeKey,
  getParentFromNode,
  getAnonymousKey,
  findVariableInfo,
  getUnionTypeLiteral,
  getTupleTypeLiteral,
  getObjectTypeLiteral,
  findNearestTypeScope,
  getFunctionTypeLiteral,
  findNearestScopeByType,
  getTypeFromTypeAnnotation
} from "../utils/utils";
import {
  Meta,
  Type,
  Scope,
  TypeVar,
  CallMeta,
  UnionType,
  TYPE_SCOPE,
  TupleType,
  ObjectType,
  GenericType,
  ModuleScope,
  FunctionType,
  VariableInfo,
  UNDEFINED_TYPE
} from "../type/types";
import type { CallableTarget } from "../type/types";

const inferenceRecordType = (
  currentNode: ObjectExpression,
  typeScope: Scope,
  parentScope: ModuleScope | Scope,
  typeGraph: ModuleScope
): ObjectType => {
  const properties = currentNode.properties.reduce((res, p) => {
    if (p.computed || p.kind === "set") {
      return res;
    }
    let varInfo = new VariableInfo(
      inferenceTypeForNode(
        p.type === NODE.OBJECT_PROPERTY ? p.value : p,
        typeScope,
        parentScope,
        typeGraph
      ),
      parentScope,
      new Meta(p.loc)
    );
    if (
      p.type === NODE.OBJECT_METHOD ||
      (p.value && NODE.isFunction(p.value))
    ) {
      varInfo = findVariableInfo(
        { name: getAnonymousKey(p.value || p) },
        parentScope
      );
    }
    return res.concat([[String(p.key.name || p.key.value), varInfo]]);
  }, []);
  return ObjectType.createTypeWithName(
    getObjectTypeLiteral(properties),
    typeScope,
    properties
  );
};

const inferenceArrayType = (
  currentNode: ArrayExpression,
  typeScope: Scope,
  parentScope: ModuleScope | Scope,
  typeGraph: ModuleScope
): ObjectType => {
  const items = currentNode.elements.map(a =>
    inferenceTypeForNode(a, typeScope, parentScope, typeGraph)
  );
  return TupleType.createTypeWithName(
    getTupleTypeLiteral(items),
    typeScope,
    items
  );
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

const inferenceFunctionLiteralType = (
  currentNode: Function,
  typeScope: Scope,
  parentNode: ModuleScope | Scope
): $PropertyType<CallableTarget, "type"> => {
  let shouldBeGeneric =
    currentNode.typeParameters !== undefined ||
    currentNode.returnType === undefined;
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  const genericArguments: Array<TypeVar> = [];
  if (currentNode.typeParameters) {
    currentNode.typeParameters.params.forEach(typeAnnotation =>
      genericArguments.push(
        (getTypeFromTypeAnnotation({ typeAnnotation }, localTypeScope): any)
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
        false
      ): any)
    : addTypeVar(typeVarNames[argumentsTypes.length], localTypeScope);
  if (!currentNode.returnType) {
    genericArguments.push(returnType);
  }
  const typeName = getFunctionTypeLiteral(
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
};

const getCallTarget = (callTarget: $PropertyType<CallableTarget, "type">) => {
  if (callTarget instanceof GenericType) {
    callTarget = callTarget.subordinateType;
  }
  return callTarget;
};

const isArgumentVariable = x => {
  const type = x instanceof VariableInfo ? x.type : x;
  return type instanceof TypeVar;
};

const resolveOuterTypeVarsFromCall = (
  call: CallMeta,
  typeScope: Scope,
  typeGraph: ModuleScope
) => {
  if (!call.arguments.some(isArgumentVariable)) {
    return;
  }
  const callTarget: FunctionType = getCallTarget(
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
};

export const implicitApplyGeneric = (
  fn: GenericType<FunctionType>,
  argumentsTypes: Array<Type>,
  loc: any
): FunctionType => {
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
};

export const getInvocationType = (
  fn: FunctionType | GenericType<FunctionType>,
  argumentsTypes: Array<Type>,
  genericArguments?: Array<Type>,
  loc: any
): Type => {
  if (fn instanceof FunctionType) {
    return fn.returnType;
  }
  const resultFn = genericArguments
    ? fn.applyGeneric(genericArguments, loc)
    : implicitApplyGeneric(fn, argumentsTypes, loc);
  return resultFn.returnType;
};

type GenericFunctionScope = {
  calls: Array<CallMeta>,
  type: "function",
  body: $PropertyType<Scope, "body">,
  declaration: {
    type: GenericType<FunctionType>
  }
};

export const inferenceFunctionTypeByScope = (
  functionScope: GenericFunctionScope,
  typeGraph: ModuleScope
) => {
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
  const newFunctionTypeName = getFunctionTypeLiteral(
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
};

export const inferenceErrorType = (
  tryNode: Node,
  typeGraph: ModuleScope
): Type => {
  const globalTypeScope = typeGraph.body.get(TYPE_SCOPE);
  const tryScope = typeGraph.body.get(getScopeKey(tryNode));
  if (
    !(tryScope instanceof Scope) ||
    !tryScope.throwable ||
    !(globalTypeScope instanceof Scope)
  ) {
    throw new Error("Never");
  }
  const { throwable } = tryScope;
  const variants =
    throwable.map(t => (t instanceof VariableInfo ? t.type : t)) || [];
  if (!variants.length) {
    const errorType = typeGraph.body.get("Error");
    if (!(errorType instanceof VariableInfo)) {
      throw new Error("Never");
    }
    //$FlowIssue
    return getInvocationType(errorType.type);
  }
  if (variants.length === 1) {
    return variants[0];
  }
  return UnionType.createTypeWithName(
    getUnionTypeLiteral(variants),
    globalTypeScope,
    variants
  );
};

export const inferenceTypeForNode = (
  currentNode: Node,
  typeScope: Scope,
  parentNode: Scope | ModuleScope,
  typeGraph: ModuleScope
): Type => {
  switch (currentNode.type) {
    case NODE.NUMERIC_LITERAL:
      return Type.createTypeWithName("number", typeScope);
    case NODE.STRING_LITERAL:
      return Type.createTypeWithName("string", typeScope);
    case NODE.BOOLEAN_LITERAL:
      return Type.createTypeWithName("boolean", typeScope);
    case NODE.NULL_LITERAL:
      return Type.createTypeWithName(null, typeScope);
    case NODE.REG_EXP_LITERAL:
      return ObjectType.createTypeWithName("RegExp", typeScope);
    case NODE.IDENTIFIER:
      const variableInfo = findVariableInfo(currentNode, parentNode);
      return variableInfo.type;
    case NODE.ARRAY_EXPRESSION:
      return inferenceArrayType(currentNode, typeScope, parentNode, typeGraph);
    case NODE.OBJECT_EXPRESSION:
      return inferenceRecordType(currentNode, typeScope, parentNode, typeGraph);
    case NODE.OBJECT_METHOD:
    case NODE.FUNCTION_DECLARATION:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
      return inferenceFunctionLiteralType(currentNode, typeScope, parentNode);
  }
  throw new Error(currentNode.type);
};
