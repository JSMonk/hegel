// @flow
import NODE from "../utils/nodes";
import { TypeScope } from "../type-graph/type-scope";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableScope } from "../type-graph/variable-scope";
import type { Node } from "@babel/parser";
import type { VariableInfo } from "../type-graph/variable-info";
import type { VariableScopeType } from "../type-graph/variable-scope";

export function getScopeType(node: Node): VariableScopeType {
  switch (node.type) {
    case NODE.BLOCK_STATEMENT:
      return VariableScope.BLOCK_TYPE;
    case NODE.FUNCTION_DECLARATION:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.OBJECT_METHOD:
    case NODE.CLASS_METHOD:
    case NODE.FUNCTION_TYPE_ANNOTATION:
      return VariableScope.FUNCTION_TYPE;
    case NODE.OBJECT_EXPRESSION:
      return VariableScope.OBJECT_TYPE;
    case NODE.CLASS_DECLARATION:
    case NODE.CLASS_EXPRESSION:
      return VariableScope.CLASS_TYPE;
  }
  throw new Error("Never for getScopeType");
}

export function findNearestScopeByType(
  type: VariableScopeType | Array<VariableScopeType>,
  parentContext: ModuleScope | VariableScope
): VariableScope | ModuleScope {
  type = Array.isArray(type) ? type : [type];
  let parent = parentContext;
  while (parent instanceof VariableScope) {
    if (type.includes(parent.type)) {
      return parent;
    }
    parent = parent.parent;
  }
  return parent;
}

export function findNearestTypeScope(
  currentScope: VariableScope | ModuleScope,
  typeGraph: ModuleScope
): TypeScope {
  let scope = findNearestScopeByType(
    [VariableScope.FUNCTION_TYPE, VariableScope.CLASS_TYPE],
    currentScope
  );
  do {
    // $FlowIssue
    if (scope.declaration && "localTypeScope" in scope.declaration.type) {
      // $FlowIssue
      return scope.declaration.type.localTypeScope;
    }
    const parent = scope.parent;
    if (parent === null) {
      break;
    }
    scope = findNearestScopeByType(
      [VariableScope.FUNCTION_TYPE, VariableScope.CLASS_TYPE],
      parent
    );
  } while (scope.parent instanceof VariableScope);
  return typeGraph.typeScope;
}

export function getParentForNode(
  currentNode: Node,
  parentNode: ?Node,
  typeGraph: ModuleScope
): ModuleScope | VariableScope {
  if (!parentNode || parentNode.type === NODE.PROGRAM) {
    return typeGraph;
  }
  const name = VariableScope.getName(parentNode);
  const scope = typeGraph.body.get(name);
  if (!(scope instanceof VariableScope)) {
    return typeGraph;
  }
  if (NODE.isUnscopableDeclaration(currentNode)) {
    return findNearestScopeByType(
      VariableScope.FUNCTION_TYPE,
      scope || typeGraph
    );
  }
  return scope;
}

export function getScopeFromNode(
  currentNode: Node,
  parentNode: Node | ModuleScope | VariableScope,
  typeGraph: ModuleScope,
  declaration?: VariableInfo
) {
  return new VariableScope(
    getScopeType(currentNode),
    parentNode instanceof VariableScope || parentNode instanceof ModuleScope
      ? parentNode
      : getParentForNode(currentNode, parentNode, typeGraph),
    declaration
  );
}

export function addScopeToTypeGraph(
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope
) {
  const scopeName = VariableScope.getName(currentNode);
  if (typeGraph.body.get(scopeName)) {
    return;
  }
  typeGraph.body.set(
    scopeName,
    getScopeFromNode(currentNode, parentNode, typeGraph)
  );
}
