// @flow
import HegelError from "../utils/errors";
import { getNameForType } from "../utils/utils";
import { implicitApplyGeneric } from "../inference";
import {
  Type,
  Scope,
  CallMeta,
  UnionType,
  GenericType,
  VariableInfo,
  FunctionType
} from "../type/types";
import type { ModuleScope } from "../type/types";

const getCallTargetType = (
  target: $PropertyType<CallMeta, "target">,
  args
): FunctionType => {
  const targetType = target instanceof VariableInfo ? target.type : target;
  return targetType instanceof GenericType
    ? implicitApplyGeneric(targetType, args)
    : (targetType: any);
};

const checkSingleCall = (call: CallMeta, typeScope: Scope): void => {
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
};

const checkCalls = (
  scope: Scope | ModuleScope,
  typeScope: Scope,
  errors: Array<HegelError>
): void => {
  for (let i = 0; i < scope.calls.length; i++) {
    try {
      checkSingleCall(scope.calls[i], typeScope);
    } catch (e) {
      errors.push(e);
    }
  }
};

export default checkCalls;
