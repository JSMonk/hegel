// @flow
import { Type } from "../type-graph/types/type";
import { UnionType } from "../type-graph/types/union-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import type { Node } from "@babel/parser";

export function inferenceErrorType(tryNode: Node, moduleScope: ModuleScope) {
  const tryScope = moduleScope.scopes.get(VariableScope.getName(tryNode));
  if (tryScope === undefined || tryScope.throwable === undefined) {
    throw new Error("Never");
  }
  const variants = tryScope.throwable.map((t) =>
    t instanceof VariableInfo ? t.type : t
  );
  return UnionType.term(null, {}, variants);
}
