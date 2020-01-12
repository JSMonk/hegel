// @flow
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { getFalsy, isFalsy } from "../utils/type-utils";
import type { Identifier } from "@babel/parser";
import type { TypeScope } from "../type-graph/type-scope";
import type { ModuleScope } from "../type-graph/module-scope";
import type { VariableScope } from "../type-graph/variable-scope";

function getFalsyVariants(type: Type) {
  return getFalsy().filter(falsy => type.isPrincipalTypeFor(falsy));
}

function getTruthyVariants(type: Type) {
  if (isFalsy(type)) {
    return [];
  }
  if (type === Type.Boolean) {
    return [Type.term(true, { isSubtypeOf: Type.Boolean })];
  }
  if (type instanceof UnionType) {
    return type.variants.filter(variant => !isFalsy(variant));
  }
  return [type];
}

export function variableRefinement(
  node: Identifier,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): ?[string, Type, Type] {
  const name = node.name;
  const variableInfo = currentScope.findVariable(node);
  const refinementedVariants = getTruthyVariants(variableInfo.type);
  const alternateVariants = getFalsyVariants(variableInfo.type);
  if (
    !(variableInfo.type instanceof TypeVar) &&
    refinementedVariants.length === 0
  ) {
    throw new HegelError(
      `Type ${String(variableInfo.type.name)} can't be falsy type`,
      node.loc
    );
  }
  return [
    name,
    UnionType.term(null, {}, refinementedVariants),
    UnionType.term(null, {}, alternateVariants)
  ];
}
