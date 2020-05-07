// @flow
import NODE from "../utils/nodes";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { getFalsy, isFalsy } from "../utils/type-utils";
import { refinementProperty } from "./equals-refinement";
import { getPropertyChaining } from "../utils/inference-utils";
import { getMemberExressionTarget } from "../utils/common";
import type { TypeScope } from "../type-graph/type-scope";
import type { ModuleScope } from "../type-graph/module-scope";
import type { VariableScope } from "../type-graph/variable-scope";
import type { Identifier, MemberExpression } from "@babel/parser";

function getFalsyVariants(type: Type) {
  return getFalsy().filter(falsy => type.isPrincipalTypeFor(falsy));
}

function getTruthyVariants(type: Type) {
  if (isFalsy(type)) {
    return [];
  }
  if (type === UnionType.Boolean) {
    return [Type.True];
  }
  if (type instanceof UnionType) {
    return type.variants.filter(variant => !isFalsy(variant));
  }
  return [type];
}

function forVariable(
  node: Identifier,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope
): ?[string, Type, Type] {
  const name = node.name;
  const variableInfo = currentScope.findVariable(node);
  const refinementedVariants = getTruthyVariants(variableInfo.type);
  const alternateVariants = getFalsyVariants(variableInfo.type);
  if (
    !(variableInfo.type instanceof TypeVar) &&
    refinementedVariants.length === 0
  ) {
    return;
  }
  return [
    name,
    UnionType.term(null, {}, refinementedVariants),
    UnionType.term(null, {}, alternateVariants)
  ];
}

function forProperty(
  node: MemberExpression,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope
): ?[string, Type, Type] {
  const targetObject = getMemberExressionTarget(node);
  if (targetObject.type !== NODE.IDENTIFIER) {
    return;
  }
  const variableName = targetObject.name;
  const propertiesChaining = getPropertyChaining(node);
  const targetVariableInfo = currentScope.findVariable(targetObject);
  if (!variableName || !propertiesChaining) {
    return;
  }
  const refinementType = UnionType.term(null, {}, getFalsy());
  const refinmentedAndAlternate = refinementProperty(
    variableName,
    targetVariableInfo.type,
    refinementType,
    node,
    0,
    propertiesChaining,
    typeScope,
    true
  );
  if (
    !refinmentedAndAlternate ||
    !refinmentedAndAlternate[0] ||
    !refinmentedAndAlternate[1]
  ) {
    return;
  }
  return [variableName, refinmentedAndAlternate[1], refinmentedAndAlternate[0]];
}

export function variableRefinement(
  node: Identifier | MemberExpression,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): ?[string, Type, Type] {
  return node.type === NODE.IDENTIFIER
    ? forVariable(node, currentScope, typeScope)
    : forProperty(node, currentScope, typeScope);
}
