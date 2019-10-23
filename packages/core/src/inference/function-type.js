// @flow
import NODES from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { Meta } from "../type-graph/meta/meta";
import { Scope } from "../type-graph/scope";
import { TypeVar } from "../type-graph/types/type-var";
import { CallMeta } from "../type-graph/meta/call-meta";
import { UnionType } from "../type-graph/types/union-type";
import { addTypeVar } from "../utils/type-utils";
import { $BottomType } from "../type-graph/types/bottom-type";
import { addPosition } from "../utils/position-utils";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { CollectionType } from "../type-graph/types/collection-type";
import { UNDEFINED_TYPE } from "../type-graph/constants";
import { getVariableType } from "../utils/variable-utils";
import { addCallToTypeGraph } from "../type-graph/call";
import { FunctionType, RestArgument } from "../type-graph/types/function-type";
import { getTypeFromTypeAnnotation, getTypeRoot } from "../utils/type-utils";
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
  typeGraph: ModuleScope,
  isTypeDefinitions: boolean
): CallableType {
  const { expected } = currentNode;
  const expectedType = isGenericFunctionType(expected)
    ? expected.subordinateType
    : expected;
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  const functionScope = isTypeDefinitions
    ? new Scope(Scope.FUNCTION_TYPE, parentNode)
    : typeGraph.body.get(Scope.getName(currentNode));
  if (!(functionScope instanceof Scope)) {
    throw new Error("Function scope should be created before inference");
  }
  const genericArguments: Set<TypeVar> = new Set();
  if (currentNode.typeParameters != undefined) {
    currentNode.typeParameters.params.forEach(typeAnnotation =>
      genericArguments.add(
        (getTypeFromTypeAnnotation(
          { typeAnnotation },
          localTypeScope,
          parentNode
        ): any)
      )
    );
  }
  const argumentsTypes = currentNode.params.map((param, index) => {
    if (param.optional && !isTypeDefinitions) {
      throw new HegelError(
        "The optional argument syntax is not allowed. Please use maybe type syntax.",
        param.loc
      );
    }
    const { name } = param.left || param;
    const typeNode =
      param.left !== undefined
        ? param.left.typeAnnotation
        : param.typeAnnotation;
    const typeAnnotation = param.optional
      ? {
          typeAnnotation: { ...typeNode, type: NODES.NULLABLE_TYPE_ANNOTATION }
        }
      : typeNode;
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
    if (param.type === NODES.REST_ELEMENT) {
      if (!(paramType instanceof CollectionType)) {
        throw new HegelError(
          "Rest argument type should be an array-like",
          param.typeAnnotation.loc
        );
      }
      paramType = new RestArgument(paramType);
    }
    if (paramType.name === UNDEFINED_TYPE) {
      let typeVar;
      if (expectedType instanceof FunctionType) {
        typeVar = expectedType.argumentsTypes[index];
      }
      typeVar = typeVar || addTypeVar(typeVarNames[index], localTypeScope);
      if (typeVar instanceof TypeVar) {
        genericArguments.add(typeVar);
      }
      return typeVar;
    }
    return paramType;
  });
  let returnType =
    currentNode.returnType != undefined
      ? (getTypeFromTypeAnnotation(
          currentNode.returnType,
          localTypeScope,
          parentNode,
          false
        ): any)
      : addTypeVar(typeVarNames[argumentsTypes.length], localTypeScope);
  if (!currentNode.returnType) {
    if (expectedType instanceof FunctionType) {
      returnType = expectedType.returnType;
      returnType =
        returnType instanceof TypeVar
          ? Object.assign(returnType, { isUserDefined: false })
          : returnType;
    }
    if (returnType instanceof TypeVar) {
      genericArguments.add(returnType);
    }
  }
  const genericArgumentsTypes = [...genericArguments];
  const typeName = FunctionType.getName(
    argumentsTypes,
    returnType,
    genericArgumentsTypes
  );
  const type = FunctionType.createTypeWithName(
    typeName,
    typeScope,
    argumentsTypes,
    returnType
  );
  return genericArgumentsTypes.length > 0
    ? GenericType.createTypeWithName(
        typeName,
        typeScope,
        genericArgumentsTypes,
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
  genericArguments: Array<TypeVar>,
  typeScope: Scope,
  typeGraph: ModuleScope
) {
  if (!call.arguments.some(isArgumentVariable)) {
    return;
  }
  const callTarget: FunctionType = getCallTarget(call);

  for (let i = 0; i < call.arguments.length; i++) {
    const callArgument = call.arguments[i];
    const callArgumentType =
      callArgument instanceof VariableInfo ? callArgument.type : callArgument;
    const callTargetType = callTarget.argumentsTypes[i];
    if (
      !(callArgumentType instanceof TypeVar) ||
      (callArgumentType.isUserDefined &&
        genericArguments.includes(callArgumentType)) ||
      callArgumentType === callTargetType
    ) {
      continue;
    }
    if (
      callArgumentType.root !== undefined &&
      !(callArgumentType.root instanceof TypeVar)
    ) {
      continue;
    }
    if (
      callTargetType instanceof TypeVar &&
      callTargetType.constraint === undefined
    ) {
      continue;
    }
    callArgumentType.root =
      callTargetType instanceof RestArgument
        ? // $FlowIssue
          callTargetType.type.valueType
        : callTargetType;
  }
}

export function implicitApplyGeneric(
  fn: GenericType<FunctionType>,
  argumentsTypes: Array<Type | VariableInfo>,
  loc: SourceLocation
): FunctionType {
  const appliedArgumentsTypes: Map<mixed, Type> = new Map();
  for (let i = 0; i < argumentsTypes.length; i++) {
    const maybeBottom = fn.subordinateType.argumentsTypes[i];
    const givenArgument = argumentsTypes[i];
    const givenArgumentType =
      givenArgument instanceof VariableInfo
        ? givenArgument.type
        : givenArgument;
    let declaratedArgument = maybeBottom;
    declaratedArgument =
      declaratedArgument instanceof $BottomType
        ? declaratedArgument.unpack()
        : declaratedArgument;
    declaratedArgument =
      declaratedArgument instanceof GenericType
        ? declaratedArgument.subordinateType
        : declaratedArgument;
    const difference = givenArgumentType.getDifference(declaratedArgument);
    for (let j = 0; j < difference.length; j++) {
      let { root, variable } = difference[j];
      root = getTypeRoot(root);
      variable = getTypeRoot(variable);
      const existed = appliedArgumentsTypes.get(variable);
      if (
        !(variable instanceof TypeVar) ||
        variable === root ||
        (existed !== undefined &&
          existed.name !== UNDEFINED_TYPE &&
          (!(existed instanceof TypeVar) || root instanceof TypeVar))
      ) {
        continue;
      }
      appliedArgumentsTypes.set(variable, root);
    }
    if (maybeBottom instanceof $BottomType) {
      maybeBottom.unrootSubordinateType();
    }
  }
  const rootFinder = t => {
    const root = getTypeRoot(t);
    let mainRoot = appliedArgumentsTypes.get(root);
    while (appliedArgumentsTypes.has(mainRoot)) {
      mainRoot = appliedArgumentsTypes.get(mainRoot);
    }
    // $FlowIssue
    return mainRoot;
  };
  argumentsTypes.forEach(variable => {
    if (variable instanceof Type || !isGenericFunctionType(variable.type)) {
      return;
    }
    const appliedArguments = variable.type.genericArguments.map(
      a => (a.root = rootFinder(a))
    );
    if (appliedArguments.includes(undefined)) {
      return;
    }
    // $FlowIssue
    variable.type = variable.type.applyGeneric(appliedArguments);
    variable.meta.changed = true;
  });
  return fn.applyGeneric(
    fn.genericArguments.map(t => rootFinder(t) || getTypeRoot(t)),
    loc
  );
}

export function getRawFunctionType(
  fn: FunctionType | GenericType<FunctionType>,
  args: Array<Type | VariableInfo>,
  genericArguments?: Array<Type> | null,
  loc: SourceLocation
) {
  if (fn instanceof FunctionType) {
    return fn;
  }
  return genericArguments != null
    ? fn.applyGeneric(genericArguments, loc)
    : implicitApplyGeneric(fn, args, loc);
}

export function getInvocationType(
  fn: FunctionType | GenericType<FunctionType>,
  argumentsTypes: Array<Type | VariableInfo>,
  genericArguments?: Array<Type> | null,
  loc: SourceLocation
): Type {
  let { returnType } =
    fn instanceof FunctionType
      ? fn
      : getRawFunctionType(fn, argumentsTypes, genericArguments, loc);
  returnType =
    returnType instanceof TypeVar ? getTypeRoot(returnType) : returnType;
  returnType =
    returnType instanceof $BottomType ? returnType.unpack() : returnType;
  return returnType instanceof TypeVar ? getTypeRoot(returnType) : returnType;
}

export function clearRoot(type: Type) {
  while (type instanceof TypeVar && type.root != undefined) {
    const root = type.root;
    type.root = undefined;
    type = root;
  }
}

export function inferenceFunctionTypeByScope(
  functionScope: GenericFunctionScope,
  typeScope: Scope,
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
    resolveOuterTypeVarsFromCall(
      calls[i],
      genericArguments,
      localTypeScope,
      typeGraph
    );
  }
  for (let i = 0; i < calls.length; i++) {
    if (
      calls[i].targetName === "return" &&
      returnType instanceof TypeVar &&
      !returnType.isUserDefined
    ) {
      const [returnArgument] = calls[i].arguments;
      const newReturnType =
        returnArgument instanceof VariableInfo
          ? returnArgument.type
          : returnArgument;
      returnType.root = getVariableType(
        null,
        newReturnType instanceof TypeVar
          ? getTypeRoot(newReturnType)
          : newReturnType,
        typeScope,
        true
      );
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
  const created: Map<TypeVar, TypeVar> = new Map();
  for (let i = 0; i < genericArguments.length; i++) {
    const genericArg = genericArguments[i];
    const root = getTypeRoot(genericArg);
    if (root instanceof TypeVar && !genericArguments.includes(root)) {
      const alreadyCreated = created.get(root);
      const newRoot =
        alreadyCreated !== undefined
          ? alreadyCreated
          : Object.assign(new TypeVar(""), root, {
              isUserDefined: false
            });
      genericArg.root = newRoot;
      if (alreadyCreated === undefined) {
        created.set(root, newRoot);
      }
    }
  }
  for (const [_, v] of functionScope.body) {
    if (v.type instanceof TypeVar && v.type.root != undefined) {
      // $FlowIssue
      v.type = getTypeRoot(v.type);
    }
  }
  let newGenericArguments: Set<TypeVar> = new Set();
  const newArgumentsTypes = argumentsTypes.map(t => {
    const result =
      t instanceof TypeVar && t.root != undefined ? getTypeRoot(t) : t;
    if (result instanceof TypeVar) {
      newGenericArguments.add(result);
    }
    return result;
  });
  const newReturnType =
    returnType instanceof TypeVar && returnType.root != undefined
      ? getTypeRoot(returnType)
      : returnType;
  if (newReturnType instanceof TypeVar) {
    newGenericArguments.add(newReturnType);
  }
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    for (let j = 0; j < call.arguments.length; j++) {
      const argument = call.arguments[j];
      if (argument instanceof TypeVar && argument.root !== undefined) {
        call.arguments[j] = getTypeRoot(argument);
      }
    }
  }
  const types = newArgumentsTypes.concat(newReturnType);
  for (let i = 0; i < genericArguments.length; i++) {
    const genericArgument = genericArguments[i];
    clearRoot(genericArgument);
    const isTypeVarStillExisted = types.find(arg =>
      arg.contains(genericArgument)
    );
    if (isTypeVarStillExisted && genericArgument instanceof TypeVar) {
      newGenericArguments.add(genericArgument);
    }
  }
  const newGenericArgumentsTypes = [...newGenericArguments];
  const newFunctionTypeName = FunctionType.getName(
    newArgumentsTypes,
    newReturnType,
    newGenericArgumentsTypes
  );
  let newFunctionType = new FunctionType(
    newFunctionTypeName,
    newArgumentsTypes,
    newReturnType
  );
  if (newGenericArgumentsTypes.length > 0) {
    newFunctionType = new GenericType(
      newFunctionTypeName,
      newGenericArgumentsTypes,
      localTypeScope,
      newFunctionType
    );
  }
  functionScope.declaration.type = newFunctionType;
}

export function isGenericFunctionType(type: Type): boolean %checks {
  return (
    type instanceof GenericType && type.subordinateType instanceof FunctionType
  );
}

export function inferenceFunctionByUsage(
  fnVar: VariableInfo & { type: GenericType<FunctionType> },
  expected: FunctionType,
  typeScope: Scope,
  typeGraph: ModuleScope
) {
  const fn = fnVar.type;
  const expectedArgs = expected.argumentsTypes;
  const applied = [];
  const given = [];
  // $FlowIssue
  fn.subordinateType.argumentsTypes.forEach((a, i) => {
    const expected = expectedArgs[i];
    if (
      a instanceof TypeVar &&
      !a.isUserDefined &&
      expected instanceof Type &&
      !(expected instanceof TypeVar)
    ) {
      given.push(a);
      applied.push(expected);
    }
  });
  const resultFunction = fn.changeAll(given, applied, typeScope);
  const scope = typeGraph.body.get(Scope.getName(fnVar.meta));
  if (!(scope instanceof Scope)) {
    throw new Error("Never!");
  }
  const { body, calls } = scope;
  for (const [_, v] of body) {
    if (v instanceof VariableInfo && v.type instanceof TypeVar) {
      // $FlowIssue
      v.type = v.type.changeAll(given, applied, typeScope);
      addPosition(v.meta, v, typeGraph);
    }
  }
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    for (let j = 0; j < call.arguments.length; j++) {
      const argument = call.arguments[j];
      if (argument instanceof TypeVar) {
        call.arguments[j] = argument.changeAll(given, applied, typeScope);
      }
    }
  }
  return resultFunction;
}
