// @flow
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { VariableInfo } from "../type-graph/variable-info";
import { UNDEFINED_TYPE } from "../type-graph/constants";
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

export function getVariableType(variable: VariableInfo, newType: Type): Type {
  if (variable.type.name !== UNDEFINED_TYPE) {
    return variable.type;
  }
  if (
    newType.constructor === Type &&
    newType.name !== null &&
    newType.isLiteralOf
  ) {
    return newType.isLiteralOf;
  }
  return newType;
}
