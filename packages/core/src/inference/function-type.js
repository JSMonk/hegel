// @flow
import NODES from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { Meta } from "../type-graph/meta/meta";
import { TypeVar } from "../type-graph/types/type-var";
import { CallMeta } from "../type-graph/meta/call-meta";
import { TypeScope } from "../type-graph/type-scope";
import { THIS_TYPE } from "../type-graph/constants";
import { TupleType } from "../type-graph/types/tuple-type";
import { UnionType } from "../type-graph/types/union-type";
import { addTypeVar } from "../utils/type-utils";
import { $BottomType } from "../type-graph/types/bottom-type";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { $PropertyType } from "../type-graph/types/property-type";
import { $ThrowsResult } from "../type-graph/types/throws-type";
import { VariableScope } from "../type-graph/variable-scope";
import { CollectionType } from "../type-graph/types/collection-type";
import { getVariableType } from "../utils/variable-utils";
import { $AppliedImmutable } from "../type-graph/types/immutable-type";
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
  "_a",
  "_b",
  "_c",
  "_d",
  "_e",
  "_f",
  "_g",
  "_h",
  "_i",
  "_j",
  "_k",
  "_l",
  "_m",
  "_n",
  "_o",
  "_p",
  "__a",
  "__b",
  "__c",
  "__d",
  "__e",
  "__f",
  "__g",
  "__h",
  "__i",
  "__j",
  "__k",
  "__l",
  "__m",
  "__n",
  "__o",
  "__p"
];

const isValidRestArgumentType = (type: Type) =>
  type instanceof CollectionType ||
  type instanceof TupleType ||
  (type instanceof $BottomType &&
    type.getRootedSubordinateType().isPrincipalTypeFor(CollectionType.Array));

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
  } else {
    localTypeScope.makeCustom();
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
        "The optional argument syntax is not allowed. Use optional type instead.",
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
      new VariableInfo(paramType, functionScope, new Meta(param.loc))
    );
    if (param.left !== undefined) {
      if (
        !isWithoutAnnotation &&
        typeNode.typeAnnotation.type === NODES.NULLABLE_TYPE_ANNOTATION
      ) {
        throw new HegelError(
          "Argument cannot be optional and has initializer.",
          typeNode.typeAnnotation.loc
        );
      }
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
            new VariableInfo(paramType, functionScope),
            newType,
            typeScope,
            callResultType.inferenced
          );
      const variants = [paramType, Type.Undefined];
      paramType = UnionType.term(null, {}, variants);
    }
    if (isWithoutAnnotation && paramType === Type.Unknown) {
      const typeVar = addTypeVar(
        typeVarNames[nameIndex + index],
        localTypeScope
      );
      if (typeVar instanceof TypeVar) {
        genericArguments.add(typeVar);
      }
      paramType = typeVar;
    }
    if (param.type === NODES.REST_ELEMENT) {
      if (
        !isWithoutAnnotation &&
        !(
          (paramType instanceof UnionType &&
            paramType.variants.every(isValidRestArgumentType)) ||
          isValidRestArgumentType(paramType)
        )
      ) {
        throw new HegelError(
          "Rest argument type should be an array-like",
          param.typeAnnotation.loc
        );
      }
      paramType =
        paramType instanceof TypeVar && !paramType.isUserDefined
          ? Type.find("Array").applyGeneric([Type.Unknown])
          : paramType;
      paramType = RestArgument.term(null, {}, paramType);
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
  }
  if (returnType instanceof $ThrowsResult || returnType instanceof UnionType) {
    if (returnType instanceof UnionType) {
      const [returnTypes, errors] = returnType.variants.reduce(
        ([result, errors], type) =>
          type instanceof $ThrowsResult
            ? [result, [...errors, type.errorType]]
            : [[...result, type], errors],
        [[], []]
      );
      if (errors.length !== 0) {
        returnType = UnionType.term(null, {}, returnTypes);
        throwableType = new $ThrowsResult(
          null,
          {},
          UnionType.term(null, {}, errors)
        );
      }
    } else {
      throwableType = returnType;
      returnType = Type.Undefined;
    }
  }

  if (currentNode.async) {
    const unknownPromise = Type.Unknown.promisify();
    if (
      !unknownPromise.isPrincipalTypeFor(returnType) &&
      currentNode.returnType != undefined
    ) {
      throw new HegelError(
        `Return type of async function should be an promise`,
        currentNode.returnType.loc
      );
    }
  }
  const genericArgumentsTypes = [...genericArguments];
  const typeName = FunctionType.getName(
    argumentsTypes,
    returnType,
    genericArgumentsTypes,
    currentNode.async,
    throwableType && throwableType.errorType
  );
  const type = FunctionType.term(typeName, {}, argumentsTypes, returnType);
  type.isAsync = currentNode.async === true;
  type.throwable = throwableType && throwableType.errorType;
  if (genericArgumentsTypes.length === 0 || !(type instanceof FunctionType)) {
    return type;
  }
  return GenericType.new(
    typeName,
    {},
    genericArgumentsTypes,
    localTypeScope,
    type
  );
}

export function getCallTarget(
  call: CallMeta,
  withClean?: boolean = true
): FunctionType {
  let callTargetType =
    call.target instanceof VariableInfo ? call.target.type : call.target;
  if (callTargetType instanceof $AppliedImmutable) {
    callTargetType = callTargetType.readonly;
  }
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
  const callTarget: FunctionType = getCallTarget(call, false);
  if (callTarget === undefined) {
    return;
  }
  // $FlowIssue
  const level = oldGenericArguments[0];
  const roots: Map<Type, Type> = new Map();
  for (let i = 0; i < call.arguments.length; i++) {
    const callArgument = call.arguments[i];
    let actualType =
      callArgument instanceof VariableInfo ? callArgument.type : callArgument;
    let declaratedType = callTarget.argumentsTypes[i];
    if (actualType === undefined || declaratedType === undefined) {
      continue;
    }
    if (declaratedType instanceof RestArgument) {
      actualType = TupleType.term(
        null,
        {},
        call.arguments
          .slice(i)
          .map(a => (a instanceof VariableInfo ? a.type : a))
      );
      i = call.arguments.length;
    }
    actualType = Type.getTypeRoot(actualType, true);
    declaratedType = Type.getTypeRoot(declaratedType);
    // $FlowIssue
    const difference = declaratedType.getDifference(actualType, true);
    for (let j = 0; j < difference.length; j++) {
      let { root, variable } = difference[j];
      if (TypeVar.isSelf(root)) {
        continue;
      }
      root = Type.getTypeRoot(root);
      variable = Type.getTypeRoot(variable, true);
      if (
        !genericArguments.some(arg => arg.contains(variable)) ||
        (genericArguments.includes(variable) && variable.isUserDefined)
      ) {
        continue;
      }
      const shouldSetNewRoot =
        variable instanceof TypeVar &&
        !root.contains(variable) &&
        (variable.constraint === undefined ||
          variable.constraint.isPrincipalTypeFor(root)) &&
        (variable.root === undefined ||
          variable.root.isSuperTypeFor(variable.root));
      if (!genericArguments.includes(variable)) {
        genericArguments.push(variable);
      }
      if (!shouldSetNewRoot) {
        continue;
      }
      variable.root = root;
    }
  }
}

export function implicitApplyGeneric(
  fn: GenericType<FunctionType>,
  argumentsTypes: Array<Type | VariableInfo<Type>>,
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
    let givenArgumentType =
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
    if (declaratedArgument instanceof RestArgument) {
      givenArgumentType = TupleType.term(
        null,
        {},
        argumentsTypes
          .slice(i)
          .map(a => (a instanceof VariableInfo ? a.type : a))
      );
      declaratedArgument = declaratedArgument.type;
    }
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
          (!(root instanceof TypeVar && !root.isUserDefined) &&
            root.isSuperTypeFor(existed)));
      if (!shouldSetNewRoot) {
        const principal = existed && existed.findPrincipal(root);
        if (principal === undefined) {
          continue;
        }
        root = principal;
      }
      appliedArgumentsTypes.set(variable, root);
    }
    if (maybeBottom instanceof $BottomType) {
      maybeBottom.unrootSubordinateType();
    }
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
    if (
      resultType instanceof TypeVar &&
      resultType === t &&
      resultType.defaultType !== undefined
    ) {
      return resultType.defaultType;
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
  "_q",
  "_r",
  "_s",
  "_t",
  "_u",
  "_v",
  "_w",
  "_x",
  "_y",
  "_z"
];

let iterator = 0;

export function getRawFunctionType(
  fn: FunctionType | GenericType<FunctionType> | TypeVar,
  args: Array<Type | VariableInfo<Type>>,
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
    const argTypes = args.map(a => {
      const result = a instanceof VariableInfo ? a.type : a;
      if (result instanceof TypeVar && !isReachableType(result, fn.parent)) {
        fn.parent.body.set(result.name, result);
      }
      return result;
    });
    const returnTypeName = invocationTypeNames[iterator];
    const returnType = TypeVar.new(returnTypeName, { parent: fn.parent });
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
  argumentsTypes: Array<Type | VariableInfo<Type>>,
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
    returnType instanceof $BottomType &&
    (returnType.genericArguments.every(t => !(t instanceof TypeVar)) ||
      returnType.subordinateMagicType instanceof $PropertyType)
      ? returnType.unpack()
      : returnType;
  return returnType instanceof TypeVar
    ? Type.getTypeRoot(returnType)
    : returnType;
}

export function clearRoot(type: TypeVar) {
  type.root = undefined;
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
  let finalReturnWasCalled = false;
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
    const call = calls[i];
    if (call.isFinal) {
      finalReturnWasCalled = true;
    }
    if (
      call.targetName === "return" &&
      returnType instanceof TypeVar &&
      !returnType.isUserDefined
    ) {
      returnWasCalled = true;
      const {
        arguments: [returnArgument],
        inferenced
      } = call;
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
  if (
    returnWasCalled &&
    !finalReturnWasCalled &&
    returnType instanceof TypeVar &&
    !returnType.isUserDefined
  ) {
    const variants =
      returnType.root !== undefined ? [Type.getTypeRoot(returnType)] : [];
    returnType.root = UnionType.term(null, {}, [
      ...variants,
      isAsync ? Type.Undefined.promisify() : Type.Undefined
    ]);
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
  const [allVars, allRoots] = genericArguments.reduce(
    ([vars, roots], t) =>
      t.root !== undefined
        ? [vars.concat([t]), roots.concat([Type.getTypeRoot(t)])]
        : [vars, roots],
    [[], []]
  );
  for (const scope of nestedScopes) {
    for (const [_, v] of scope.body) {
      if (v.type instanceof TypeVar && v.type.root != undefined) {
        v.type = Type.getTypeRoot(v.type);
      } else {
        // $FlowIssue
        v.type = v.type.changeAll(allVars, allRoots);
      }
    }
  }
  let newGenericArguments: Set<TypeVar> = new Set();
  const newArgumentsTypes = argumentsTypes.map(t => {
    let result =
      t instanceof TypeVar && t.root != undefined ? Type.getTypeRoot(t) : t;
    // $FlowIssue
    result = result.changeAll(allVars, allRoots, typeScope);
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
  newReturnType = newReturnType.changeAll(allVars, allRoots, typeScope);
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
            args[j] = argument.changeAll(allVars, allRoots, typeScope);
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
    if (genericArgument.isUserDefined) {
      newGenericArguments.add(genericArgument);
      continue;
    }
    const oldRoot = Type.getTypeRoot(genericArgument);
    clearRoot(genericArgument);
    const isTypeVarStillExisted = newArgumentsTypes.find(
      arg =>
        arg.contains(genericArgument) &&
        !isReachableType(arg, localTypeScope.parent)
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
  for (let i = 0; i < genericArguments.length; i++) {
    const genericArgument = genericArguments[i];
    const root = Type.getTypeRoot(
      genericArgument.changeAll(allVars, allRoots, localTypeScope)
    );
    if (
      !(root instanceof TypeVar) ||
      oldGenericArguments.some(
        a => root.equalsTo(a, true) || genericArgument.equalsTo(a, true)
      )
    ) {
      continue;
    }
    newGenericArguments.add(root);
  }
  shouldBeCleaned.forEach(clearRoot);
  const newGenericArgumentsTypes = [...newGenericArguments]
    .filter(t => !isReachableType(t, localTypeScope.parent))
    .map(t => {
      t.isUserDefined = true;
      return t;
    });
  const newFunctionTypeName = FunctionType.getName(
    newArgumentsTypes,
    newReturnType,
    newGenericArgumentsTypes,
    isAsync,
    throwable
  );
  let newFunctionType = FunctionType.term(
    newFunctionTypeName,
    {},
    newArgumentsTypes,
    newReturnType,
    isAsync
  );
  if (
    newFunctionType instanceof FunctionType &&
    newFunctionType.throwble === undefined
  ) {
    newFunctionType.throwable = throwable;
  }
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
