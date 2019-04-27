// @flow
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { CallMeta } from "../type-graph/meta/call-meta";
import { UnionType } from "../type-graph/types/union-type";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { getNameForType } from "../utils/type-utils";
import { implicitApplyGeneric } from "../inference/function-type";
import type { CallableType } from "../type-graph/meta/call-meta";
import type { SourceLocation } from "@babel/parser";

function getCallTargetType(target: CallableType, args): FunctionType {
  // $FlowIssue
  const targetType = target instanceof VariableInfo ? target.type : target;
  return targetType instanceof GenericType
    ? implicitApplyGeneric(targetType, args)
    : (targetType: any);
}

function isValidTypes(
  declaratedType: Type,
  actual: Type | VariableInfo,
  typeScope: Scope
): boolean {
  const actualType =
    (actual instanceof VariableInfo ? actual.type : actual) ||
    Type.createTypeWithName("undefined", typeScope);
  if (actualType instanceof UnionType) {
    return actualType.variants.every(t =>
      isValidTypes(declaratedType, t, typeScope)
    );
  }
  if ("onlyLiteral" in declaratedType && actual instanceof VariableInfo) {
    return declaratedType.equalsTo(actualType);
  }
  return declaratedType.isPrincipalTypeFor(actualType);
}

function checkSingleCall(call: CallMeta, typeScope: Scope): void {
  const givenArgumentsTypes = call.arguments.map(
    t => (t instanceof VariableInfo ? t.type : t)
  );
  const targetFunctionType = getCallTargetType(
    // $FlowIssue
    call.target.type || call.target,
    givenArgumentsTypes
  );
  const targetArguments = targetFunctionType.argumentsTypes;
  const requiredTargetArguments = targetArguments.filter(
    a =>
      !(a instanceof UnionType) ||
      !a.variants.includes(Type.createTypeWithName("void", typeScope))
  );
  if (requiredTargetArguments.length > givenArgumentsTypes.length) {
    throw new HegelError(
      `${requiredTargetArguments.length} arguments are required. Given ${
        givenArgumentsTypes.length
      }.`,
      call.loc
    );
  }
  for (let i = 0; i < targetArguments.length; i++) {
    if (!isValidTypes(targetArguments[i], call.arguments[i], typeScope)) {
      const actualArgumentType =
        givenArgumentsTypes[i] ||
        Type.createTypeWithName("undefined", typeScope);
      throw new HegelError(
        `Type "${getNameForType(
          actualArgumentType
        )}" is incompatible with type "${getNameForType(targetArguments[i])}"`,
        call.loc
      );
    }
  }
}

function checkCalls(
  scope: Scope | ModuleScope,
  typeScope: Scope,
  errors: Array<HegelError>,
  loc: SourceLocation
): void {
  let returnWasCalled = false;
  for (let i = 0; i < scope.calls.length; i++) {
    if (scope.calls[i].targetName === "return") {
      returnWasCalled = true;
    }
    try {
      checkSingleCall(scope.calls[i], typeScope);
    } catch (e) {
      errors.push(e);
    }
  }
  if (
    scope.type === Scope.FUNCTION_TYPE &&
    scope.declaration instanceof VariableInfo &&
    !returnWasCalled
  ) {
    const functionDeclaration: any =
      scope.declaration.type instanceof GenericType
        ? scope.declaration.type.subordinateType
        : scope.declaration.type;
    if (
      !functionDeclaration.returnType.isPrincipalTypeFor(
        new Type("undefined", { isSubtypeOf: new Type("void") })
      )
    ) {
      throw new HegelError(
        `Function should return something with type "${getNameForType(
          functionDeclaration.returnType
        )}"`,
        loc
      );
    }
  }
}

export default checkCalls;
