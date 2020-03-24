// @flow
import NODE from "./nodes";
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { addVariableToGraph } from "./variable-utils";
import { inferenceTypeForNode } from "../inference";
import { PositionedModuleScope } from "../type-graph/module-scope";
import { getDeclarationName, getAnonymousKey } from "./common";
import {
  getParentForNode,
  getScopeFromNode,
  findNearestTypeScope
} from "../utils/scope-utils";
import type { Handler } from "./traverse";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  Identifier,
  FunctionDeclaration,
  ClassMethod,
  ClassProperty
} from "@babel/core";

export function addFunctionScopeToTypeGraph(
  currentNode: Node,
  parentNode: Node | VariableScope | ModuleScope,
  moduleScope: ModuleScope,
  variableInfo: VariableInfo
) {
  const scope = getScopeFromNode(
    currentNode,
    parentNode,
    moduleScope,
    variableInfo
  );
  scope.throwable = [];
  moduleScope.scopes.set(VariableScope.getName(currentNode), scope);
  if (currentNode.type === NODE.FUNCTION_EXPRESSION && currentNode.id) {
    scope.body.set(getDeclarationName(currentNode), variableInfo);
  }
  return scope;
}

export function addFunctionNodeToTypeGraph(
  currentNode: FunctionDeclaration | ClassMethod | ClassProperty,
  parentNode: Node,
  moduleScope: ModuleScope
) {
  const name = getDeclarationName(currentNode);
  const currentScope = getParentForNode(currentNode, parentNode, moduleScope);
  currentScope.body.set(name, currentNode);
}

export function addFunctionToTypeGraph(
  currentNode: Node,
  parentNode: Node,
  moduleScope: ModuleScope | PositionedModuleScope,
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
    moduleScope,
    pre,
    middle,
    post,
    name
  );
  variableInfo.isInferenced = currentNode.returnType === undefined;
  const currentTypeScope = findNearestTypeScope(
    variableInfo.parent,
    moduleScope
  );
  const scope = isTypeDefinitions
    ? new VariableScope(VariableScope.FUNCTION_TYPE, variableInfo.parent)
    : addFunctionScopeToTypeGraph(
        currentNode,
        parentNode,
        moduleScope,
        variableInfo
      );
  variableInfo.type = inferenceTypeForNode(
    currentNode,
    currentTypeScope,
    variableInfo.parent,
    moduleScope,
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
    const expectedReturnType = expectedType.returnType;
      if (
        functionType.returnType instanceof TypeVar &&
        !functionType.returnType.isUserDefined &&
        expectedReturnType.parent.priority <= 1
      ) {
        functionType.returnType = expectedReturnType;
        variableInfo.isInferenced = false;
      }
  }
  const withPositions = moduleScope instanceof PositionedModuleScope;
  currentNode.params.forEach((param, index) => {
    let type = (functionType: any).argumentsTypes[index];
    const id = param.left || param.argument || param;
    if (param.left != undefined && type instanceof UnionType) {
      const types = type.variants.filter(a => a !== Type.Undefined);
      type = UnionType.term(null, { parent: currentTypeScope }, types);
    }
    if (param.argument != undefined) {
      type = type.type;
    }
    let varInfo = scope.body.get(id.name);
    if (varInfo !== undefined) {
      varInfo.type = type;
      varInfo.parent = scope;
    } else {
      varInfo = new VariableInfo(type, scope, new Meta(id.loc));
      scope.body.set(id.name, varInfo);
    }
    if (withPositions) {
      // $FlowIssue
      moduleScope.addPosition(id, varInfo);
    }
  });
  if (withPositions && currentNode.id != null) {
    // $FlowIssue
    moduleScope.addPosition(currentNode.id, variableInfo);
  }
  return variableInfo;
}

export function isCallableType(a: Type) {
  if (a instanceof GenericType) {
    a = a.subordinateType;
  }
  return a instanceof FunctionType;
}

export function functionWithReturnType(
  functionType: GenericType<FunctionType> | FunctionType,
  newReturnType: Type
) {
  const oldFunctionType =
    functionType instanceof GenericType
      ? functionType.subordinateType
      : functionType;
  const newFunctionArguments = [...oldFunctionType.argumentsTypes];
  const newFunctionGenericArguments =
    functionType instanceof GenericType
      ? [...functionType.genericArguments]
      : [];
  const newFunctionType = FunctionType.term(
    FunctionType.getName(
      newFunctionArguments,
      newReturnType,
      newFunctionGenericArguments,
      oldFunctionType.isAsync
    ),
    {},
    newFunctionArguments,
    newReturnType
  );
  if (
    !(functionType instanceof GenericType) ||
    newFunctionType instanceof GenericType
  ) {
    return newFunctionType;
  }
  return GenericType.new(
    newFunctionType.name,
    {},
    newFunctionGenericArguments,
    functionType.localTypeScope,
    newFunctionType
  );
}
