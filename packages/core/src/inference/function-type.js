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
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { CollectionType } from "../type-graph/types/collection-type";
import { UNDEFINED_TYPE } from "../type-graph/constants";
import { getVariableType } from "../utils/variable-utils";
import { addCallToTypeGraph } from "../type-graph/call";
import { findNearestTypeScope } from "../utils/scope-utils";
import { FunctionType, RestArgument } from "../type-graph/types/function-type";
import {
  isReachableType,
  getTypeFromTypeAnnotation
} from "../utils/type-utils";
import type { Handler } from "../utils/traverse";
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
  "a'",
  "b'",
  "c'",
  "d'",
  "e'",
  "f'",
  "g'",
  "h'",
  "i'",
  "j'",
  "k'",
  "l'",
  "m'",
  "n'",
  "o'",
  "p'"
];

export function inferenceFunctionLiteralType(
  currentNode: Function,
  typeScope: Scope,
  parentScope: ModuleScope | Scope,
  typeGraph: ModuleScope,
  isTypeDefinitions: boolean,
  parentNode: Node,
  pre: Handler,
  post: Handler
): CallableType {
  const localTypeScope = new Scope(
    Scope.BLOCK_TYPE,
    findNearestTypeScope(parentScope, typeGraph)
  );
  const functionScope = isTypeDefinitions
    ? new Scope(Scope.FUNCTION_TYPE, parentScope)
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
          parentScope
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
      parentScope,
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
        functionScope,
        parentNode,
        pre,
        post
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
          parentScope,
          false
        ): any)
      : addTypeVar(typeVarNames[argumentsTypes.length], localTypeScope);
  if (!currentNode.returnType) {
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

export function getCallTarget(
  call: CallMeta,
  withClean?: boolean = true
): FunctionType {
  let callTargetType = call.target.type || call.target;
  if (callTargetType instanceof TypeVar) {
    callTargetType = Type.getTypeRoot(callTargetType);
  }
  if (callTargetType instanceof GenericType) {
    callTargetType = getRawFunctionType(
      callTargetType,
      call.arguments,
      null,
      callTargetType.localTypeScope,
      call.loc,
      // $FlowIssue
      withClean
    );
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
  const callTarget: FunctionType = getCallTarget(call, false);

  for (let i = 0; i < call.arguments.length; i++) {
    const callArgument = call.arguments[i];
    const callArgumentType =
      callArgument instanceof VariableInfo ? callArgument.type : callArgument;
    if (
      callArgumentType instanceof TypeVar &&
      !callArgumentType.isUserDefined &&
      !genericArguments.includes(callArgumentType)
    ) {
      genericArguments.push(callArgumentType);
    }
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
    if (callTargetType instanceof TypeVar && !callTargetType.isUserDefined) {
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
  localTypeScope: Scope,
  loc: SourceLocation,
  withClean?: boolean = true
): FunctionType {
  const appliedArgumentsTypes: Map<mixed, Type> = new Map();
  const unreachableTypes: Set<TypeVar> = new Set();
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
      root = Type.getTypeRoot(root);
      variable = Type.getTypeRoot(variable);
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
  if (appliedArgumentsTypes.size === 0) {
    return fn.subordinateType;
  }
  const rootFinder = t => {
    const root = Type.getTypeRoot(t);
    let mainRoot = appliedArgumentsTypes.get(root);
    while (appliedArgumentsTypes.has(mainRoot)) {
      mainRoot = appliedArgumentsTypes.get(mainRoot);
    }
    // $FlowIssue
    return mainRoot;
  };
  const appliedParameters = fn.genericArguments.map(t => {
    const resultType = rootFinder(t) || Type.getTypeRoot(t);
    if (
      resultType instanceof TypeVar &&
      !isReachableType(resultType, localTypeScope)
    ) {
      unreachableTypes.add(resultType);
    }
    return resultType;
  });
  const result = fn
    .applyGeneric(appliedParameters, loc)
    .generalize([...unreachableTypes], localTypeScope);

  if (withClean) {
    fn.genericArguments.forEach(clearRoot);
  }
  return result;
}

const invocationTypeNames = [
  "q'",
  "r'",
  "s'",
  "t'",
  "u'",
  "v'",
  "w'",
  "x'",
  "y'",
  "z'"
];

let iterator = 0;

export function getRawFunctionType(
  fn: FunctionType | GenericType<FunctionType> | TypeVar,
  args: Array<Type | VariableInfo>,
  genericArguments?: Array<Type> | null,
  localTypeScope: Scope,
  loc: SourceLocation,
  withClean?: boolean = true
) {
  fn =
    fn instanceof TypeVar && fn.root !== undefined ? Type.getTypeRoot(fn) : fn;
  if (fn instanceof FunctionType) {
    return fn;
  }
  if (fn instanceof TypeVar) {
    if (fn.isUserDefined) {
      throw new Error("Never!");
    }
    const argTypes = args.map(a => (a instanceof VariableInfo ? a.type : a));
    const returnTypeName = invocationTypeNames[iterator];
    const returnType = new TypeVar(returnTypeName);
    const newFunctionTypeName = FunctionType.getName(argTypes, returnType);
    const result = new FunctionType(newFunctionTypeName, argTypes, returnType);
    fn.root = result;
    return result;
  }
  const result =
    genericArguments != null
      ? fn.applyGeneric(genericArguments, loc)
      : implicitApplyGeneric(fn, args, localTypeScope, loc, withClean);
  if (result instanceof GenericType) {
    return result.subordinateType;
  }
  return result;
}

export function getInvocationType(
  fn: FunctionType | GenericType<FunctionType> | TypeVar,
  argumentsTypes: Array<Type | VariableInfo>,
  genericArguments?: Array<Type> | null,
  localTypeScope: Scope,
  loc: SourceLocation
): Type {
  let { returnType } =
    fn instanceof FunctionType
      ? fn
      : getRawFunctionType(
          fn,
          argumentsTypes,
          genericArguments,
          localTypeScope,
          loc
        );
  returnType =
    returnType instanceof TypeVar ? Type.getTypeRoot(returnType) : returnType;
  returnType =
    returnType instanceof $BottomType ? returnType.unpack() : returnType;
  return returnType instanceof TypeVar
    ? Type.getTypeRoot(returnType)
    : returnType;
}

export function clearRoot(type: Type) {
  while (type instanceof TypeVar && type.root != undefined) {
    const root = type.root;
    type.root = undefined;
    type = root;
  }
}

export function prepareGenericFunctionType(
  functionScope: GenericFunctionScope
) {
  const { genericArguments } = functionScope.declaration.type;
  for (let i = 0; i < genericArguments.length; i++) {
    const genericArgument = genericArguments[i];
    if (genericArgument instanceof TypeVar && genericArgument.isUserDefined) {
      clearRoot(genericArgument);
    }
  }
}

export function inferenceFunctionTypeByScope(
  functionScope: GenericFunctionScope,
  typeScope: Scope,
  typeGraph: ModuleScope
) {
  const { calls = [] } = functionScope;
  const {
    genericArguments: oldGenericArguments,
    localTypeScope,
    subordinateType: { argumentsTypes, returnType }
  } = functionScope.declaration.type;
  const genericArguments = [...oldGenericArguments];
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
      const {
        arguments: [returnArgument],
        inferenced
      } = calls[i];
      const newReturnType =
        returnArgument instanceof VariableInfo
          ? returnArgument.type
          : returnArgument;
      const newOneRoot = getVariableType(
        null,
        newReturnType instanceof TypeVar
          ? Type.getTypeRoot(newReturnType)
          : newReturnType,
        typeScope,
        inferenced
      );
      const variants = (returnType.root instanceof UnionType
        ? returnType.root.items
        : [returnType.root]
      ).concat([newOneRoot]);
      returnType.root =
        returnType.root != undefined
          ? UnionType.createTypeWithName(
              // $FlowIssue
              UnionType.getName(variants),
              localTypeScope,
              variants
            )
          : newOneRoot;
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
    const root = Type.getTypeRoot(genericArg);
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
  const allRoots = genericArguments.map(Type.getTypeRoot);
  for (const [_, v] of functionScope.body) {
    if (v.type instanceof TypeVar && v.type.root != undefined) {
      // $FlowIssue
      v.type = Type.getTypeRoot(v.type);
    } else {
      // $FlowIssue
      v.type = v.type.changeAll(genericArguments, allRoots);
    }
  }
  let newGenericArguments: Set<TypeVar> = new Set();
  const newArgumentsTypes = argumentsTypes.map(t => {
    let result =
      t instanceof TypeVar && t.root != undefined ? Type.getTypeRoot(t) : t;
    // $FlowIssue
    result = result.changeAll(genericArguments, allRoots);
    if (result instanceof TypeVar && !isReachableType(result, localTypeScope)) {
      newGenericArguments.add(result);
    }
    return result;
  });
  const newReturnType =
    returnType instanceof TypeVar && returnType.root != undefined
      ? Type.getTypeRoot(returnType)
      : returnType;
  if (newReturnType instanceof TypeVar) {
    newGenericArguments.add(newReturnType);
  }
  const shouldBeCleaned = [];
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    const args = call.arguments;
    const target = call.target;
    const targetType = target instanceof VariableInfo ? target.type : target;
    for (let j = 0; j < args.length; j++) {
      const argument = args[j];
      const argumentType =
        argument instanceof VariableInfo ? argument.type : argument;
      if (!(argumentType instanceof TypeVar)) {
        continue;
      }
      const copy = created.get(argumentType);
      if (argumentType.root !== undefined) {
        args[j] = Type.getTypeRoot(argumentType);
        if (oldGenericArguments.includes(argumentType)) {
          shouldBeCleaned.push(argumentType);
        }
      } else if (copy !== undefined) {
        args[j] = copy;
        if (
          call.targetName === "return" &&
          call.target instanceof FunctionType
        ) {
          // $FlowIssue
          call.target = targetType.changeAll([argumentType], [copy], typeScope);
        }
      }
    }
    if (targetType instanceof GenericType) {
      targetType.genericArguments.forEach(a => shouldBeCleaned.push(a));
    }
  }
  for (let i = 0; i < oldGenericArguments.length; i++) {
    const genericArgument = oldGenericArguments[i];
    clearRoot(genericArgument);
    const isTypeVarStillExisted = newArgumentsTypes.find(arg =>
      arg.contains(genericArgument)
    );
    if (isTypeVarStillExisted && genericArgument instanceof TypeVar) {
      newGenericArguments.add(genericArgument);
    }
  }
  shouldBeCleaned.forEach(clearRoot);
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
