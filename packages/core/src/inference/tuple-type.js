// @flow
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { TupleType } from "../type-graph/types/tuple-type";
import { UnionType } from "../type-graph/types/union-type";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { addCallToTypeGraph } from "../type-graph/call";
import { TYPE_SCOPE } from "../type-graph/constants";
import { findVariableInfo } from "../utils/common";
import type { Handler } from "../utils/traverse";
import type { ArrayExpression } from "@babel/parser";

export function inferenceTupleType(
  currentNode: ArrayExpression,
  typeScope: Scope,
  parentScope: ModuleScope | Scope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler
): TupleType {
  const globalTypeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!(globalTypeScope instanceof Scope)) {
    throw new Error("Never!");
  }
  const items = currentNode.elements.map(a => {
    const inferenced = addCallToTypeGraph(
      a,
      typeGraph,
      parentScope,
      parentNode,
      pre,
      middle,
      post
    );
    return inferenced.result.type || inferenced.result;
  });
  const parentType = findVariableInfo({ name: "Array" }, globalTypeScope).type;
  if (!(parentType instanceof GenericType)) {
    throw new Error("Never!");
  }
  const isSubtypeOf = parentType.applyGeneric([
    items.length !== 0
      ? UnionType.createTypeWithName(UnionType.getName(items), typeScope, items)
      : new Type("unknown")
  ]);
  return TupleType.createTypeWithName(
    TupleType.getName(items),
    typeScope,
    items,
    { isSubtypeOf }
  );
}
