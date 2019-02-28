// @flow
import { Meta } from "../type-graph/meta/meta";
import { VariableInfo } from "../type-graph/variable-info";
import { getTypeFromTypeAnnotation } from "./type-utils";
import { getParentForNode, findNearestTypeScope } from "./scope-utils";
import type { Node } from "@babel/parser";
import type { Scope } from "../type-graph/scope";
import type { ModuleScope } from "../type-graph/module-scope";

export function getVariableInfoFromDelcaration(
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope
) {
  const parentScope = getParentForNode(currentNode, parentNode, typeGraph);
  const currentTypeScope = findNearestTypeScope(parentScope, typeGraph);
  const annotatedType = getTypeFromTypeAnnotation(
    currentNode.id && currentNode.id.typeAnnotation,
    currentTypeScope,
    false
  );
  return new VariableInfo(
    annotatedType,
    parentScope,
    new Meta(currentNode.loc)
  );
}
