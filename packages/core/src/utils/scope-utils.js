// @flow
import NODE from "../utils/nodes";
import { Scope } from "../type-graph/scope";
import { ModuleScope } from "../type-graph/module-scope";
import { TYPE_SCOPE } from "../type-graph/constants";
import type { Node } from "@babel/parser";
import type { ScopeType } from "../type-graph/scope";
import type { VariableInfo } from "../type-graph/variable-info";

export function getScopeType(node: Node): ScopeType {
  switch (node.type) {
    case NODE.BLOCK_STATEMENT:
      return Scope.BLOCK_TYPE;
    case NODE.FUNCTION_DECLARATION:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.OBJECT_METHOD:
    case NODE.CLASS_METHOD:
    case NODE.FUNCTION_TYPE_ANNOTATION:
      return Scope.FUNCTION_TYPE;
    case NODE.OBJECT_EXPRESSION:
      return Scope.OBJECT_TYPE;
    case NODE.CLASS_DECLARATION:
    case NODE.CLASS_EXPRESSION:
      return Scope.CLASS_TYPE;
  }
  throw new Error("Never for getScopeType");
}

export function getTypeScope(scope: Scope | ModuleScope): Scope {
  const typeScope = scope.body.get(TYPE_SCOPE);
  if (typeScope instanceof Scope) {
    return typeScope;
  }
  if (scope.parent) {
    return getTypeScope(scope.parent);
  }
  throw new Error("Never");
}

export function findNearestScopeByType(
  type: $PropertyType<Scope, "type">,
  parentContext: ModuleScope | Scope
): Scope | ModuleScope {
  let parent = parentContext;
  while (parent instanceof Scope) {
    if (parent.type === type) {
      return parent;
    }
    parent = parent.parent;
  }
  return parent;
}

export const findNearestTypeScope = (
  currentScope: Scope | ModuleScope,
  typeGraph: ModuleScope
): Scope => {
  let scope = findNearestScopeByType(Scope.FUNCTION_TYPE, currentScope);
  const moduleTypeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!(moduleTypeScope instanceof Scope)) {
    throw new Error("Never!");
  }
  while (scope.parent) {
    // $FlowIssue
    if (scope.declaration && "localTypeScope" in scope.declaration.type) {
      // $FlowIssue
      return scope.declaration.type.localTypeScope;
    }
    scope = findNearestScopeByType(Scope.FUNCTION_TYPE, scope.parent);
  }
  return moduleTypeScope;
};

export function getParentForNode(
  currentNode: Node,
  parentNode: ?Node,
  typeGraph: ModuleScope
): ModuleScope | Scope {
  if (!parentNode || parentNode.type === NODE.PROGRAM) {
    return typeGraph;
  }
  const name = Scope.getName(parentNode);
  const scope = typeGraph.body.get(name);
  if (!(scope instanceof Scope)) {
    return typeGraph;
  }
  if (NODE.isUnscopableDeclaration(currentNode)) {
    return findNearestScopeByType(Scope.FUNCTION_TYPE, scope || typeGraph);
  }
  return scope;
}

export function getScopeFromNode(
  currentNode: Node,
  parentNode: Node | ModuleScope | Scope,
  typeGraph: ModuleScope,
  declaration?: VariableInfo
) {
  return new Scope(
    getScopeType(currentNode),
    parentNode instanceof Scope || parentNode instanceof ModuleScope
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
  const scopeName = Scope.getName(currentNode);
  if (typeGraph.body.get(scopeName)) {
    return;
  }
  typeGraph.body.set(
    scopeName,
    getScopeFromNode(currentNode, parentNode, typeGraph)
  );
}
