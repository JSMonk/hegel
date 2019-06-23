// @flow
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { TupleType } from "../type-graph/types/tuple-type";
import { ModuleScope } from "../type-graph/module-scope";
import { addCallToTypeGraph } from "../type-graph/call";
import type { ArrayExpression } from "@babel/parser";

export function inferenceTupleType(
  currentNode: ArrayExpression,
  typeScope: Scope,
  parentScope: ModuleScope | Scope,
  typeGraph: ModuleScope
): TupleType {
  const items = currentNode.elements.map(a => {
    const inferenced = addCallToTypeGraph(a, typeGraph, parentScope);
    const inferencedType = inferenced.result.type || inferenced.result;
    return inferencedType.constructor === Type && inferencedType.isSubtypeOf
      ? inferencedType.isSubtypeOf
      : inferencedType;
  });
  return TupleType.createTypeWithName(
    TupleType.getName(items),
    typeScope,
    items
  );
}
