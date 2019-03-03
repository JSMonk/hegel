// @flow
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { TupleType } from "../type-graph/types/tuple-type";
import { ModuleScope } from "../type-graph/module-scope";
import { inferenceTypeForNode } from "./index";
import type { ArrayExpression } from "@babel/parser";

export function inferenceTupleType(
  currentNode: ArrayExpression,
  typeScope: Scope,
  parentScope: ModuleScope | Scope,
  typeGraph: ModuleScope
): TupleType {
  const items = currentNode.elements.map(a => {
    const inferencedType = inferenceTypeForNode(
      a,
      typeScope,
      parentScope,
      typeGraph
    );
    return inferencedType.constructor === Type && inferencedType.isLiteralOf
      ? inferencedType.isLiteralOf
      : inferencedType;
  });
  return TupleType.createTypeWithName(
    TupleType.getName(items),
    typeScope,
    items
  );
}
