// @flow
import { Type } from "../type-graph/types/type";
import { TupleType } from "../type-graph/types/tuple-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableScope } from "../type-graph/variable-scope";
import { addCallToTypeGraph } from "../type-graph/call";
import type { Handler } from "../utils/traverse";
import type { TypeScope } from "../type-graph/type-scope";
import type { ArrayExpression } from "@babel/parser";

export function inferenceTupleType(
  currentNode: ArrayExpression,
  typeScope: TypeScope,
  parentScope: ModuleScope | VariableScope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler
): TupleType {
  const items = currentNode.elements.map(a => {
    if (a === null) {
      return Type.Undefined;
    }
    const { result } = addCallToTypeGraph(
      a,
      typeGraph,
      parentScope,
      parentNode,
      pre,
      middle,
      post
    );
    return result instanceof Type ? result : result.type;
  });
  return TupleType.term(null, {}, items);
}
