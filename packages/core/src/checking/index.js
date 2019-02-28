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

function getCallTargetType(
  target: $PropertyType<CallMeta, "target">,
  args
): FunctionType {
  const targetType = target instanceof VariableInfo ? target.type : target;
  return targetType instanceof GenericType
    ? implicitApplyGeneric(targetType, args)
    : (targetType: any);
}

function checkSingleCall(call: CallMeta, typeScope: Scope): void {
  const givenArgumentsTypes = call.arguments.map(
    t => (t instanceof VariableInfo ? t.type : t)
  );
  const targetFunctionType = getCallTargetType(
    call.target,
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
    const actualArgumentType =
      givenArgumentsTypes[i] || Type.createTypeWithName("undefined", typeScope);
    if (!targetArguments[i].isPrincipalTypeFor(actualArgumentType)) {
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
  errors: Array<HegelError>
): void {
  for (let i = 0; i < scope.calls.length; i++) {
    try {
      checkSingleCall(scope.calls[i], typeScope);
    } catch (e) {
      errors.push(e);
    }
  }
}

export default checkCalls;
