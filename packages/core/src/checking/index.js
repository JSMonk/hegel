// @flow
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { CallMeta } from "../type-graph/meta/call-meta";
import { TypeScope } from "../type-graph/type-scope";
import { TupleType } from "../type-graph/types/tuple-type";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { getCallTarget } from "../inference/function-type";
import { isReachableType } from "../utils/type-utils";
import { $AppliedImmutable } from "../type-graph/types/immutable-type";
import { FunctionType, RestArgument } from "../type-graph/types/function-type";
import type { CallableType } from "../type-graph/meta/call-meta";
import type { SourceLocation } from "@babel/parser";

function getActualType(
  actual: ?Type | VariableInfo<Type> | Array<Type | VariableInfo<Type>>,
  typeScope: TypeScope
) {
  if (actual === undefined || actual === null) {
    return Type.Undefined;
  }
  if (Array.isArray(actual)) {
    const items = actual.map(a => getActualType(a, typeScope));
    return TupleType.term(TupleType.getName(items), {}, items);
  }
  if (actual instanceof VariableInfo) {
    return getActualType(actual.type, typeScope);
  }
  if (actual instanceof TypeVar && actual.root != undefined) {
    return actual.root;
  }
  return actual;
}

function isAssign(call: CallMeta) {
  return call.targetName.includes("=") && !call.targetName.includes("==");
}

function isValidTypes(
  targetName: mixed,
  declaratedType: Type | RestArgument,
  actual: ?Type | VariableInfo<Type> | Array<VariableInfo<Type> | Type>,
  typeScope: TypeScope
): boolean {
  let declaratedRootType =
    declaratedType instanceof RestArgument
      ? declaratedType.type
      : declaratedType;
  const actualRootType = getActualType(actual, typeScope);
  if (declaratedType instanceof RestArgument && Array.isArray(actual)) {
    return isValidTypes(
      targetName,
      declaratedType.type,
      actualRootType,
      typeScope
    );
  } else if (!(declaratedType instanceof RestArgument)) {
    declaratedRootType =
      declaratedRootType instanceof TypeVar && declaratedRootType.root
        ? declaratedRootType.root
        : declaratedRootType;
    if (actualRootType instanceof UnionType) {
      return actualRootType.variants.every(t =>
        isValidTypes(
          targetName,
          declaratedRootType,
          //$FlowIssue it's needed for the property consistency
          actual instanceof VariableInfo ? new VariableInfo(t) : t,
          typeScope
        )
      );
    }
    if (
      declaratedRootType.onlyLiteral &&
      !(
        declaratedRootType instanceof ObjectType && declaratedRootType.isNominal
      ) &&
      declaratedRootType !== ObjectType.Object &&
      declaratedRootType !== ObjectType.Object.root &&
      declaratedRootType !== FunctionType.Function &&
      declaratedRootType !== FunctionType.Function.root &&
      actual instanceof VariableInfo
    ) {
      return declaratedRootType.equalsTo(actualRootType);
    }
    const isAssignment =
      targetName === "return" || targetName === "init" || targetName === "=";
    if (
      (declaratedRootType instanceof FunctionType ||
        (declaratedRootType instanceof GenericType &&
          declaratedRootType.subordinateType instanceof FunctionType)) &&
      isAssignment &&
      actual instanceof VariableInfo &&
      !actual.meta.isAnonymous
    ) {
      return declaratedRootType.equalsTo(actualRootType);
    }
    if (
      isAssignment ||
      (declaratedRootType.parent.priority >= TypeScope.MODULE_SCOPE_PRIORITY &&
        isReachableType(declaratedRootType, typeScope))
    ) {
      TypeVar.strictEquality = true;
      const result = declaratedRootType.isPrincipalTypeFor(actualRootType);
      TypeVar.strictEquality = false;
      return result;
    }
    return declaratedRootType.isPrincipalTypeFor(actualRootType);
  }
  throw new Error("Never!");
}

function checkSingleCall(
  path: string,
  call: CallMeta,
  typeScope: TypeScope,
  errors: Array<HegelError>
): void {
  const givenArgumentsTypes = call.arguments.map(
    t => (t instanceof VariableInfo ? t.type : t)
  );
  const targetFunctionType = getCallTarget(call);
  const targetArguments = targetFunctionType.argumentsTypes;
  const requiredTargetArguments = targetArguments.filter(
    a =>  !(a instanceof RestArgument) && !a.isPrincipalTypeFor(Type.Undefined)
  );
  if (requiredTargetArguments.length > givenArgumentsTypes.length) {
    errors.push(
      new HegelError(
        `${requiredTargetArguments.length} arguments are required. Given ${
          givenArgumentsTypes.length
        }.`,
        call.loc,
        path
      )
    );
  } else if (
    targetArguments.length < givenArgumentsTypes.length &&
    !(targetArguments[targetArguments.length - 1] instanceof RestArgument)
  ) {
    errors.push(
      new HegelError(
        `${targetArguments.length} arguments are expected. Given ${
          givenArgumentsTypes.length
        }.`,
        call.loc,
        path
      )
    );
  } else {
    let firstArgumentType = call.arguments[0];
    firstArgumentType =
      firstArgumentType instanceof VariableInfo
        ? firstArgumentType.type
        : firstArgumentType;
    if (isAssign(call) && firstArgumentType instanceof $AppliedImmutable) {
      errors.push(
        new HegelError(`Attempt to mutate immutable type`, call.loc, path)
      );
    }
    for (let i = 0; i < targetArguments.length; i++) {
      const arg1 = targetArguments[i];
      const arg2 =
        arg1 instanceof RestArgument
          ? call.arguments.slice(i)
          : call.arguments[i];
      if (!isValidTypes(call.targetName, arg1, arg2, call.typeScope)) {
        let actualType =
          arg1 instanceof RestArgument
            ? givenArgumentsTypes.slice(i)
            : givenArgumentsTypes[i];
        actualType =
          actualType instanceof VariableInfo ? actualType.type : actualType;
        const actualTypeName =
          // $FlowIssue
          arg2 === undefined ? "undefined" : TupleType.getName(actualType);
        errors.push(
          new HegelError(
            `Type "${actualTypeName}" is incompatible with type "${String(
              arg1.name
            )}"`,
            arg1 instanceof RestArgument
              ? call.loc
              : call.argumentsLocations[i] || call.loc,
            path
          )
        );
      }
    }
  }
}

function checkCalls(
  path: string,
  scope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  errors: Array<HegelError>
): void {
  let returnWasCalled = false;
  let finalWasCalled = false;
  for (let i = 0; i < scope.calls.length; i++) {
    const call = scope.calls[i];
    if (call.target === undefined) {
      continue;
    }
    if (call.targetName === "return") {
      returnWasCalled = true;
    }
    if (call.isFinal) {
      finalWasCalled = true;
    }
    checkSingleCall(path, call, typeScope, errors);
  }
  if (
    scope instanceof VariableScope &&
    scope.type === VariableScope.FUNCTION_TYPE &&
    scope.declaration instanceof VariableInfo &&
    !returnWasCalled &&
    !finalWasCalled
  ) {
    const { declaration } = scope;
    const { returnType, isAsync }: any =
      declaration.type instanceof GenericType
        ? declaration.type.subordinateType
        : declaration.type;
    if (
      !declaration.isInferenced &&
      !isFunctionShouldNotCallReturn(returnType, isAsync)
    ) {
      errors.push(
        new HegelError(
          `Function should return something with type "${String(
            returnType.name
          )}"`,
          declaration.meta.loc,
          path
        )
      );
    }
  }
}

function isFunctionShouldNotCallReturn(returnType: Type, isAsync: boolean) {
  if (
    returnType === undefined ||
    (returnType instanceof TypeVar && !returnType.isUserDefined)
  ) {
    return true;
  }
  if (returnType instanceof UnionType) {
    return returnType.variants.some(returnType =>
      isFunctionShouldNotCallReturn(returnType, isAsync)
    );
  }
  return (
    returnType === Type.Undefined ||
    (isAsync && returnType.equalsTo(Type.Undefined.promisify()))
  );
}

export default checkCalls;
