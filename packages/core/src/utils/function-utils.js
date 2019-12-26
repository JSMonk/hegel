// @flow
import NODE from "./nodes";
import { Meta } from "../type-graph/meta/meta";
import { Scope } from "../type-graph/scope";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { addPosition } from "./position-utils";
import { VariableInfo } from "../type-graph/variable-info";
import { inferenceTypeForNode } from "../inference";
import { addVariableToGraph } from "./variable-utils";
import { getDeclarationName, getAnonymousKey } from "./common";
import { getParentForNode, getScopeFromNode, findNearestTypeScope } from "../utils/scope-utils";
import type { Type } from "../type-graph/types/type";
import type { Handler } from "./traverse";
import type { ModuleScope } from "../type-graph/module-scope";
import type { Node, Identifier, FunctionDeclaration, ClassDeclaration } from "@babel/core"

export function addFunctionScopeToTypeGraph(
  currentNode: Node,
  parentNode: Node | Scope | ModuleScope,
  typeGraph: ModuleScope,
  variableInfo: VariableInfo
) {
  const scope = getScopeFromNode(
    currentNode,
    parentNode,
    typeGraph,
    variableInfo
  );
  scope.throwable = [];
  typeGraph.body.set(Scope.getName(currentNode), scope);
  if (currentNode.type === NODE.FUNCTION_EXPRESSION && currentNode.id) {
    scope.body.set(getDeclarationName(currentNode), variableInfo);
  }
  return scope;
}

export function addFunctionNodeToTypeGraph(
  currentNode: FunctionDeclaration | ClassDeclaration,
  parentNode: Node,
  typeGraph: ModuleScope,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean
) {
  const name = getDeclarationName(currentNode);
  const currentScope = getParentForNode(currentNode, parentNode, typeGraph);
  currentScope.body.set(name, currentNode);
}

export function addFunctionToTypeGraph(
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean
) {
  const name =
    currentNode.type === NODE.FUNCTION_DECLARATION ||
    currentNode.type === NODE.TS_FUNCTION_DECLARATION
      ? getDeclarationName(currentNode)
      : getAnonymousKey(currentNode);
  const variableInfo = addVariableToGraph(
    currentNode,
    parentNode,
    typeGraph,
    name
  );
  const currentTypeScope = findNearestTypeScope(variableInfo.parent, typeGraph);
  const scope = isTypeDefinitions
    ? new Scope(Scope.FUNCTION_TYPE, currentTypeScope)
    : addFunctionScopeToTypeGraph(
        currentNode,
        parentNode,
        typeGraph,
        variableInfo
      );
  variableInfo.type = inferenceTypeForNode(
    currentNode,
    currentTypeScope,
    variableInfo.parent,
    typeGraph,
    parentNode,
    pre,
    middle,
    post,
    isTypeDefinitions
  );
  const expectedType = currentNode.expected;
  const functionType =
    variableInfo.type instanceof GenericType
      ? variableInfo.type.subordinateType
      : variableInfo.type;
  if (expectedType instanceof FunctionType) {
    // $FlowIssue
    const inferencedArgumentsTypes = functionType.argumentsTypes;
    // $FlowIssue
    const expectedArgumentsTypes = expectedType.argumentsTypes;
    for (let i = 0; i < inferencedArgumentsTypes.length; i++) {
      const inferenced = inferencedArgumentsTypes[i];
      const expected = expectedArgumentsTypes[i];
      if (
        inferenced instanceof TypeVar &&
        !inferenced.isUserDefined &&
        expected !== undefined
      ) {
        inferencedArgumentsTypes[i] = expected;
      }
    }
  }
  currentNode.params.forEach((param, index) => {
    let type = (functionType: any).argumentsTypes[index];
    if (param.left !== undefined && param.left.typeAnnotation === undefined) {
      const types = (type.variants: any).filter(a => a.name !== "undefined");
      type = UnionType.createTypeWithName(
        UnionType.getName(types),
        currentTypeScope,
        types
      );
    }
    const id = param.left || param;
    let varInfo = scope.body.get(id.name);
    if (varInfo !== undefined) {
      varInfo.type = type;
      varInfo.parent = scope;
    } else {
      varInfo = new VariableInfo(type, scope, new Meta(id.loc));
      scope.body.set(id.name, varInfo);
    }
    addPosition(id, varInfo, typeGraph);
  });
  if (currentNode.id) {
    addPosition(currentNode.id, variableInfo, typeGraph);
  }
}

export function isCallableType(a: Type) {
  if (a instanceof GenericType) {
    a = a.subordinateType;
  }
  return a instanceof FunctionType;
}
