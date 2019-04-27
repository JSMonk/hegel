// @flow
import { Scope } from "../type-graph/scope";
import { Type } from "../type-graph/types/type";
import { UnionType } from "../type-graph/types/union-type";
import { TYPE_SCOPE } from "../type-graph/constants";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { findVariableInfo } from "../utils/common";
import { getInvocationType } from "../inference/function-type";
import type { Node } from "@babel/parser";

export function inferenceErrorType(
  tryNode: Node,
  typeGraph: ModuleScope
): Type {
  const globalTypeScope = typeGraph.body.get(TYPE_SCOPE);
  const tryScope = typeGraph.body.get(Scope.getName(tryNode));
  if (
    !(tryScope instanceof Scope) ||
    !tryScope.throwable ||
    !(globalTypeScope instanceof Scope)
  ) {
    throw new Error("Never");
  }
  const { throwable } = tryScope;
  const variants =
    throwable.map(t => (t instanceof VariableInfo ? t.type : t)) || [];
  if (!variants.length) {
    const errorType = findVariableInfo({ name: "Error" }, typeGraph);
    if (!(errorType instanceof VariableInfo)) {
      throw new Error("Never");
    }
    //$FlowIssue
    return getInvocationType(errorType.type);
  }
  if (variants.length === 1) {
    return variants[0];
  }
  return UnionType.createTypeWithName(
    UnionType.getName(variants),
    globalTypeScope,
    variants
  );
}
