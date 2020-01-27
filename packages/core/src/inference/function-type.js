// @flow
import NODES from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { Meta } from "../type-graph/meta/meta";
import { TypeVar } from "../type-graph/types/type-var";
import { CallMeta } from "../type-graph/meta/call-meta";
import { TypeScope } from "../type-graph/type-scope";
import { THIS_TYPE } from "../type-graph/constants";
import { UnionType } from "../type-graph/types/union-type";
import { addTypeVar } from "../utils/type-utils";
import { $BottomType } from "../type-graph/types/bottom-type";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { $ThrowsResult } from "../type-graph/types/throws-type";
import { VariableScope } from "../type-graph/variable-scope";
import { CollectionType } from "../type-graph/types/collection-type";
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
  body: $PropertyType<VariableScope, "body">,
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
  "p'",
  "a''",
  "b''",
  "c''",
  "d''",
  "e''",
  "f''",
  "g''",
  "h''",
  "i''",
  "j''",
  "k''",
  "l''",
  "m''",
  "n''",
  "o''",
  "p''"
];

export function inferenceFunctionLiteralType(
  currentNode: Function,
  typeScope: TypeScope,
  parentScope: ModuleScope | VariableScope,
  typeGraph: ModuleScope,
  isTypeDefinitions: boolean,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler
): CallableType {
  const localTypeScope = new TypeScope(
    findNearestTypeScope(parentScope, typeGraph)
  );
  const functionScope = isTypeDefinitions
    ? new VariableScope(VariableScope.FUNCTION_TYPE, parentScope)
    : typeGraph.scopes.get(VariableScope.getName(currentNode));
  if (!(functionScope instanceof VariableScope)) {
    throw new Error("Function scope should be created before inference");
  }
  const genericArguments: Set<TypeVar> = new Set();
  if (currentNode.typeParameters != undefined) {
    currentNode.typeParameters.params.forEach(typeAnnotation =>
      genericArguments.add(
        (getTypeFromTypeAnnotation(
          { typeAnnotation },
          localTypeScope,
          parentScope,
          true,
          null,
          parentNode,
          typeGraph,
          pre,
          middle,
          post
        ): any)
      )
    );
  }
  let nameIndex = 0;
  try {
    do {
      Type.find(typeVarNames[nameIndex], { parent: localTypeScope });
      nameIndex++;
    } while (true);
  } catch {}
  const self =
    parentScope.type === VariableScope.CLASS_TYPE ||
    parentScope.type === VariableScope.OBJECT_TYPE
      ? // $FlowIssue
        parentScope.body.get(THIS_TYPE).type
      : null;
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
      false,
      // $FlowIssue
      self,
      parentNode,
      typeGraph,
      pre,
      middle,
      post
    );
    const isWithoutAnnotation = typeNode == undefined;
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
        middle,
        post
      );
      const newType =
        callResultType.result instanceof VariableInfo
          ? callResultType.result.type
          : callResultType.result;
      paramType = !isWithoutAnnotation
        ? paramType
        : getVariableType(
            new VariableInfo(paramType),
            newType,
            typeScope,
            callResultType.inferenced
          );
      const variants = [paramType, Type.Undefined];
      paramType = !isWithoutAnnotation
        ? paramType
        : UnionType.term(null, {}, variants);
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
    if (isWithoutAnnotation && paramType === Type.Unknown) {
      const typeVar = addTypeVar(
        typeVarNames[nameIndex + index],
        localTypeScope
      );
      if (typeVar instanceof TypeVar) {
        genericArguments.add(typeVar);
      }
      return typeVar;
    }
    return paramType;
  });
  let throwableType;
  let returnType =
    currentNode.returnType != undefined
      ? (getTypeFromTypeAnnotation(
          currentNode.returnType,
          localTypeScope,
          parentScope,
          false,
          // $FlowIssue
          self,
          parentNode,
          typeGraph,
          pre,
          middle,
          post
        ): any)
      : addTypeVar(
          typeVarNames[nameIndex + argumentsTypes.length],
          localTypeScope
        );
  if (currentNode.returnType == undefined) {
    if (returnType instanceof TypeVar) {
      genericArguments.add(returnType);
    }
  } else if (currentNode.async) {
    const unknownPromise = Type.Unknown.promisify();
    if (!unknownPromise.isPrincipalTypeFor(returnType)) {
      throw new HegelError(
        `Return type of async function should be an promise`,
        currentNode.returnType.loc
      );
    }
  } else if (returnType instanceof $ThrowsResult) {
    throwableType = returnType;
    returnType = returnType.resultType;
  }
  const genericArgumentsTypes = [...genericArguments];
  const typeName = FunctionType.getName(
    argumentsTypes,
    throwableType || returnType,
    genericArgumentsTypes,
    currentNode.async
  );
  const type = FunctionType.term(typeName, {}, argumentsTypes, returnType);
  type.isAsync = currentNode.async === true;
  type.throwable = throwableType && throwableType.errorType;
  return genericArgumentsTypes.length > 0
    ? GenericType.new(typeName, {}, genericArgumentsTypes, localTypeScope, type)
    : type;
}

export function getCallTarget(
  call: CallMeta,
  withClean?: boolean = true
): FunctionType {
  let callTargetType =
    call.target instanceof VariableInfo ? call.target.type : call.target;
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
  oldGenericArguments: Array<TypeVar>,
  typeScope: TypeScope,
  typeGraph: ModuleScope
) {
  if (!call.arguments.some(isArgumentVariable)) {
    return;
  }
  const callTarget: FunctionType = getCallTarget(call, false);
  if (callTarget === undefined) {
    return;
  }

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
      callTargetType === undefined ||
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
    const potentialRoot =
      callTargetType instanceof RestArgument
        ? // $FlowIssue
          callTargetType.type.valueType
        : callTargetType;
    if (!potentialRoot.contains(callArgumentType)) {
      callArgumentType.root = potentialRoot;
    }
  }
}

export function implicitApplyGeneric(
  fn: GenericType<FunctionType>,
  argumentsTypes: Array<Type | VariableInfo>,
  localTypeScope: TypeScope,
  loc: SourceLocation,
  withClean?: boolean = true,
  dropUnknown?: boolean = false
): FunctionType {
  const appliedArgumentsTypes: Map<mixed, Type> = new Map();
  const unreachableTypes: Set<TypeVar> = new Set();
  const declaratedArgumentsTypes = fn.subordinateType.argumentsTypes;
  for (let i = 0; i < declaratedArgumentsTypes.length; i++) {
    const maybeBottom = declaratedArgumentsTypes[i];
    const givenArgument = argumentsTypes[i] || Type.Undefined;
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
      if (TypeVar.isSelf(root)) {
        continue;
      }
      root = Type.getTypeRoot(root);
      variable = Type.getTypeRoot(variable);
      // $FlowIssue
      variable = fn.genericArguments.find(arg => arg.equalsTo(variable));
      if (variable === undefined) {
        continue;
      }
      const existed = appliedArgumentsTypes.get(variable);
      const shouldSetNewRoot =
        variable instanceof TypeVar &&
        variable !== root &&
        (existed === undefined ||
          existed instanceof TypeVar ||
          (dropUnknown && existed === Type.Unknown) ||
          root.isSuperTypeFor(existed));
      if (!shouldSetNewRoot) {
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
  localTypeScope: TypeScope,
  loc: SourceLocation,
  withClean?: boolean = true,
  initializing?: boolean = false,
  dropUnknown?: boolean = false
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
    const returnType = TypeVar.new(returnTypeName, { parent: localTypeScope });
    const newFunctionTypeName = FunctionType.getName(argTypes, returnType, []);
    const result = FunctionType.term(
      newFunctionTypeName,
      { parent: localTypeScope },
      argTypes,
      returnType
    );
    fn.root = result;
    return result;
  }
  const result =
    genericArguments != null
      ? // $FlowIssue
        fn.applyGeneric(genericArguments, loc, true, false, initializing)
      : implicitApplyGeneric(
          fn,
          args,
          localTypeScope,
          loc,
          withClean,
          dropUnknown
        );
  if (result instanceof GenericType) {
    return result.subordinateType;
  }
  return result;
}

export function getInvocationType(
  fn: FunctionType | GenericType<FunctionType> | TypeVar,
  argumentsTypes: Array<Type | VariableInfo>,
  genericArguments?: Array<Type> | null,
  localTypeScope: TypeScope,
  loc: SourceLocation,
  initializing?: boolean = false,
  dropUnknown?: boolean = false
): Type {
  let { returnType } =
    fn instanceof FunctionType
      ? fn
      : getRawFunctionType(
          fn,
          argumentsTypes,
          genericArguments,
          localTypeScope,
          loc,
          true,
          initializing,
          dropUnknown
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
  typeScope: TypeScope,
  typeGraph: ModuleScope
) {
  const { calls = [] } = functionScope;
  const {
    genericArguments: oldGenericArguments,
    localTypeScope,
    subordinateType: { argumentsTypes, returnType, isAsync, throwable }
  } = functionScope.declaration.type;
  const genericArguments = [...oldGenericArguments];
  let returnWasCalled = false;
  // $FlowIssue
  const nestedScopes = functionScope.getAllChildScopes(typeGraph);
  for (const { calls } of nestedScopes) {
    for (let i = 0; i < calls.length; i++) {
      resolveOuterTypeVarsFromCall(
        calls[i],
        genericArguments,
        oldGenericArguments,
        localTypeScope,
        typeGraph
      );
    }
  }
  for (let i = 0; i < calls.length; i++) {
    if (
      calls[i].targetName === "return" &&
      returnType instanceof TypeVar &&
      !returnType.isUserDefined
    ) {
      returnWasCalled = true;
      const {
        arguments: [returnArgument],
        inferenced
      } = calls[i];
      const newReturnType =
        returnArgument instanceof VariableInfo
          ? returnArgument.type
          : returnArgument;
      const newOneRoot = getVariableType(
        undefined,
        newReturnType instanceof TypeVar
          ? Type.getTypeRoot(newReturnType)
          : newReturnType,
        typeScope,
        inferenced
      );
      if (newOneRoot === returnType) {
        continue;
      }
      const oldRoot = Type.getTypeRoot(returnType);
      if (returnType.root === undefined) {
        returnType.root = newOneRoot;
      } else if (!oldRoot.isPrincipalTypeFor(newOneRoot)) {
        const variants: any = (oldRoot instanceof UnionType
          ? oldRoot.variants
          : [oldRoot]
        ).concat([newOneRoot]);
        returnType.root = UnionType.term(null, {}, variants);
      }
    }
  }
  if (
    !returnWasCalled &&
    returnType instanceof TypeVar &&
    !returnType.isUserDefined
  ) {
    returnType.root = isAsync ? Type.Undefined.promisify() : Type.Undefined;
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
  for (const scope of nestedScopes) {
    for (const [_, v] of scope.body) {
      if (v.type instanceof TypeVar && v.type.root != undefined) {
        v.type = Type.getTypeRoot(v.type);
      } else {
        // $FlowIssue
        v.type = v.type.changeAll(genericArguments, allRoots);
      }
    }
  }
  let newGenericArguments: Set<TypeVar> = new Set();
  const newArgumentsTypes = argumentsTypes.map(t => {
    let result =
      t instanceof TypeVar && t.root != undefined ? Type.getTypeRoot(t) : t;
    // $FlowIssue
    result = result.changeAll(genericArguments, allRoots, typeScope);
    if (
      result instanceof TypeVar &&
      // $FlowIssue
      !isReachableType(result, localTypeScope.parent)
    ) {
      newGenericArguments.add(result);
    }
    return result;
  });
  let newReturnType =
    returnType instanceof TypeVar && returnType.root != undefined
      ? Type.getTypeRoot(returnType)
      : returnType;
  newReturnType = newReturnType.changeAll(
    genericArguments,
    allRoots,
    typeScope
  );
  if (newReturnType instanceof TypeVar) {
    newGenericArguments.add(newReturnType);
  }
  const shouldBeCleaned = [];
  for (const { calls } of nestedScopes) {
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
          if (argument instanceof Type) {
            args[j] = argument.changeAll(genericArguments, allRoots, typeScope);
          }
          continue;
        }
        const copy = created.get(argumentType);
        if (argumentType.root !== undefined) {
          args[j] = Type.getTypeRoot(argumentType);
          if (
            oldGenericArguments.includes(argumentType) &&
            argumentType.isUserDefined
          ) {
            shouldBeCleaned.push(argumentType);
          }
        } else if (copy !== undefined) {
          args[j] = copy;
          if (
            call.targetName === "return" &&
            call.target instanceof FunctionType
          ) {
            // $FlowIssue
            call.target = targetType.changeAll(
              [argumentType],
              [copy],
              typeScope
            );
          }
        }
      }
      if (targetType instanceof GenericType) {
        targetType.genericArguments.forEach(
          a => a.isUserDefined && shouldBeCleaned.push(a)
        );
      }
    }
  }
  for (let i = 0; i < oldGenericArguments.length; i++) {
    const genericArgument = oldGenericArguments[i];
    const oldRoot = Type.getTypeRoot(genericArgument);
    clearRoot(genericArgument);
    const isTypeVarStillExisted = newArgumentsTypes.find(arg =>
      arg.contains(genericArgument)
    );
    if (isTypeVarStillExisted && genericArgument instanceof TypeVar) {
      newGenericArguments.add(genericArgument);
    }
    if (
      genericArgument instanceof TypeVar &&
      !genericArgument.isUserDefined &&
      genericArgument !== oldRoot
    ) {
      genericArgument.root = oldRoot;
    }
  }
  shouldBeCleaned.forEach(clearRoot);
  const newGenericArgumentsTypes = [...newGenericArguments];
  const newFunctionTypeName = FunctionType.getName(
    newArgumentsTypes,
    newReturnType,
    newGenericArgumentsTypes,
    isAsync
  );
  let newFunctionType = FunctionType.term(
    newFunctionTypeName,
    {},
    newArgumentsTypes,
    newReturnType,
    isAsync
  );
  newFunctionType.throwable = throwable;
  if (newGenericArgumentsTypes.length > 0) {
    newFunctionType = GenericType.new(
      newFunctionTypeName,
      {},
      newGenericArgumentsTypes,
      localTypeScope,
      newFunctionType
    );
  }
  // $FlowIssue
  functionScope.declaration.type = newFunctionType;
}

export function isGenericFunctionType(type: Type): boolean %checks {
  return (
    type instanceof GenericType && type.subordinateType instanceof FunctionType
  );
}
