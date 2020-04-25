// @flow
import NODE from "../utils/nodes";
import { TypeScope } from "../type-graph/type-scope";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import type { Node } from "@babel/parser";
import type { ObjectType } from "../type-graph/types/object-type";
import type { GenericType } from "../type-graph/types/generic-type";
import type { FunctionType } from "../type-graph/types/function-type";
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
    if (scope.declaration instanceof VariableInfo) {
      if ("localTypeScope" in scope.declaration.type) {
        // $FlowIssue
        return scope.declaration.type.localTypeScope;
      }
      if (
        scope.declaration.type.instanceType != undefined &&
        scope.declaration.type.instanceType.subordinateMagicType != undefined &&
        // $FlowIssue
        "localTypeScope" in scope.declaration.type.instanceType.subordinateMagicType
      ) {
        // $FlowIssue
        return scope.declaration.type.instanceType.subordinateMagicType.localTypeScope;
      }
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
  const scope = typeGraph.scopes.get(name);
  if (scope === undefined) {
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
  declaration?: VariableInfo<ObjectType> | VariableInfo<FunctionType> | VariableInfo<GenericType<FunctionType>>,
  scopeCreator?: string
) {
  return new VariableScope(
    getScopeType(currentNode),
    parentNode instanceof VariableScope || parentNode instanceof ModuleScope
      ? parentNode
      : getParentForNode(currentNode, parentNode, typeGraph),
    declaration,
    scopeCreator,
    currentNode.skipCalls !== undefined
  );
}

export function addScopeToTypeGraph(
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  creator?: Node
) {
  const scopeName = VariableScope.getName(currentNode);
  if (typeGraph.scopes.has(scopeName)) {
    return;
  }
  typeGraph.scopes.set(
    scopeName,
    getScopeFromNode(
      currentNode,
      parentNode,
      typeGraph,
      undefined,
      getScopeCreator(creator)
    )
  );
}

function getScopeCreator(creator: Node) {
  switch (creator.type) {
    case NODE.IF_STATEMENT:
      return "if";
    case NODE.WHILE_STATEMENT:
      return "while";
    case NODE.DO_WHILE_STATEMENT:
      return "do-while";
    case NODE.FOR_STATEMENT:
      return "for";
    case NODE.FOR_OF_STATEMENT:
      return "for-of";
    case NODE.FOR_IN_STATEMENT:
      return "for-in";
    case NODE.BLOCK_STATEMENT:
      return "block";
  }
}
