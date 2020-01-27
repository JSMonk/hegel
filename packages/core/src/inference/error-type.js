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
  const variants = tryScope.throwable.map(
    t => (t instanceof VariableInfo ? t.type : t)
  );
  if (variants.length === 0) {
    return Type.Unknown;
  }
  if (variants.length === 1) {
    return UnionType.term(null, {}, [variants[0], Type.Unknown]);
  }
  return UnionType.term(null, {}, variants.concat([Type.Unknown]));
}
