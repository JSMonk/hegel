// @flow
import NODE from "../utils/nodes";
import checkCalls from "../checking";
import HegelError from "../utils/errors";
import traverseTree from "../utils/traverse";
import mixBaseGlobals from "../utils/globals";
import mixUtilityTypes from "../utils/utility-types";
import mixBaseOperators from "../utils/operators";
import { Meta } from "./meta/meta";
import { Scope } from "./scope";
import { addPosition } from "../utils/position-utils";
import { GenericType } from "./types/generic-type";
import { ModuleScope } from "./module-scope";
import { FunctionType } from "./types/function-type";
import { VariableInfo } from "./variable-info";
import { getScopeFromNode } from "../utils/scope-utils";
import { findVariableInfo } from "../utils/common";
import { addCallToTypeGraph } from "./call";
import { getTypeFromTypeAnnotation } from "../utils/type-utils";
import { getDeclarationName, getAnonymousKey } from "../utils/common";
import { POSITIONS, TYPE_SCOPE, UNDEFINED_TYPE } from "./constants";
import { findNearestTypeScope, getParentForNode } from "../utils/scope-utils";
import { inferenceErrorType } from "../inference/error-type";
import { inferenceTypeForNode } from "../inference";
import { getVariableInfoFromDelcaration } from "../utils/variable-utils";
import {
  getInvocationType,
  inferenceFunctionTypeByScope
} from "../inference/function-type";
import type { TraverseMeta } from "../utils/traverse";
import type { Node, Program } from "@babel/parser";
import type { CallableArguments } from "./meta/call-meta";

const addVariableToGraph = (
  currentNode: Node,
  parentNode: ?Node,
  typeGraph: ModuleScope,
  customName?: string = getDeclarationName(currentNode)
) => {
  const variableInfo = getVariableInfoFromDelcaration(
    currentNode,
    parentNode,
    typeGraph
  );
  variableInfo.parent.body.set(customName, variableInfo);
  return variableInfo;
};

export const addFunctionScopeToTypeGraph = (
  currentNode: Node,
  parentNode: Node | Scope | ModuleScope,
  typeGraph: ModuleScope,
  variableInfo: VariableInfo
) => {
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
  const functionType =
    variableInfo.type instanceof GenericType
      ? variableInfo.type.subordinateType
      : variableInfo.type;
  currentNode.params.forEach((id, index) => {
    const type = (functionType: any).argumentsTypes[index];
    const varInfo = new VariableInfo(type, scope, new Meta(id.loc));
    scope.body.set(id.name, varInfo);
    addPosition(id, varInfo, typeGraph);
  });
};

const addFunctionToTypeGraph = (
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope
) => {
  const name = currentNode.id
    ? getDeclarationName(currentNode)
    : getAnonymousKey(currentNode);
  const variableInfo = addVariableToGraph(
    currentNode,
    parentNode,
    typeGraph,
    name
  );
  const currentTypeScope = findNearestTypeScope(variableInfo.parent, typeGraph);
  variableInfo.type = inferenceTypeForNode(
    currentNode,
    currentTypeScope,
    variableInfo.parent,
    typeGraph
  );
  if (currentNode.id) {
    addPosition(currentNode.id, variableInfo, typeGraph);
  }
  addFunctionScopeToTypeGraph(currentNode, parentNode, typeGraph, variableInfo);
};

const hasTypeParams = (node: Node): boolean =>
  node.typeParameters &&
  node.typeParameters.type === NODE.TYPE_PARAMETER_DECLARATION &&
  Array.isArray(node.typeParameters.params) &&
  node.typeParameters.params.length !== 0;

const getGenericNode = (node: Node): ?Node => {
  if (hasTypeParams(node)) {
    return node;
  }
  if (node.right && hasTypeParams(node.right)) {
    return node.right;
  }
  return null;
};

const addTypeAlias = (node: Node, typeGraph: ModuleScope) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (typeScope === undefined || !(typeScope instanceof Scope)) {
    throw new Error(
      "Type scope should be presented before type alias has been met"
    );
  }
  const genericNode = getGenericNode(node);
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  const usedTypeScope = genericNode ? localTypeScope : typeScope;
  const genericArguments =
    genericNode &&
    genericNode.typeParameters.params.map(typeAnnotation =>
      getTypeFromTypeAnnotation({ typeAnnotation }, localTypeScope)
    );
  const type = getTypeFromTypeAnnotation(
    { typeAnnotation: node.right },
    usedTypeScope,
    false
  );
  const typeFor = genericArguments
    ? GenericType.createTypeWithName(
        node.id.name,
        typeScope,
        genericArguments,
        localTypeScope,
        type
      )
    : type;
  const typeAlias = new VariableInfo(typeFor, typeScope, new Meta(node.loc));
  typeScope.body.set(node.id.name, typeAlias);
};

const fillModuleScope = (typeGraph: ModuleScope, errors: Array<HegelError>) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!typeScope || !(typeScope instanceof Scope)) {
    throw new Error("Type scope is not a scope.");
  }
  return (currentNode: Node, parentNode: Node, meta?: TraverseMeta = {}) => {
    switch (currentNode.type) {
      case NODE.TYPE_ALIAS:
        addTypeAlias(currentNode, typeGraph);
        break;
      case NODE.VARIABLE_DECLARATOR:
        addVariableToGraph(
          Object.assign(currentNode, meta),
          parentNode,
          typeGraph
        );
        break;
      case NODE.OBJECT_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.CLASS_DECLARATION:
      case NODE.FUNCTION_DECLARATION:
        addFunctionToTypeGraph(currentNode, parentNode, typeGraph);
        break;
      case NODE.BLOCK_STATEMENT:
        if (NODE.isFunction(parentNode)) {
          break;
        }
      case NODE.CLASS_DECLARATION:
      case NODE.CLASS_EXPRESSION:
        const scopeName = Scope.getName(currentNode);
        if (typeGraph.body.get(scopeName)) {
          break;
        }
        typeGraph.body.set(
          scopeName,
          getScopeFromNode(currentNode, parentNode, typeGraph)
        );
        break;
      case NODE.TRY_STATEMENT:
        const tryBlock = getScopeFromNode(
          currentNode.block,
          parentNode,
          typeGraph
        );
        tryBlock.throwable = [];
        typeGraph.body.set(Scope.getName(currentNode.block), tryBlock);
        if (!currentNode.handler) {
          return;
        }
        const handlerScopeKey = Scope.getName(currentNode.handler.body);
        typeGraph.body.set(
          handlerScopeKey,
          getScopeFromNode(currentNode.handler.body, parentNode, typeGraph)
        );
        if (!currentNode.handler.param) {
          return;
        }
        addVariableToGraph(
          currentNode.handler.param,
          currentNode.handler.body,
          typeGraph,
          currentNode.handler.param.name
        );
    }
  };
};

const afterFillierActions = (
  typeGraph: ModuleScope,
  errors: Array<HegelError>
) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!typeScope || !(typeScope instanceof Scope)) {
    throw new Error("Type scope is not a scope.");
  }
  return (
    currentNode: Node,
    parentNode: Node | Scope | ModuleScope,
    meta?: Object = {}
  ) => {
    const currentScope = getParentForNode(currentNode, parentNode, typeGraph);
    switch (currentNode.type) {
      case NODE.VARIABLE_DECLARATOR:
        const variableInfo = findVariableInfo(currentNode.id, currentScope);
        const newTypeOrVar = addCallToTypeGraph(
          currentNode,
          typeGraph,
          currentScope
        );
        const newType =
          newTypeOrVar instanceof VariableInfo
            ? newTypeOrVar.type
            : newTypeOrVar;
        variableInfo.type =
          variableInfo.type.name === UNDEFINED_TYPE
            ? newType
            : variableInfo.type;
        break;
      case NODE.BLOCK_STATEMENT:
        if (!currentNode.catchBlock || !currentNode.catchBlock.param) {
          return;
        }
        if (currentNode.catchBlock.param.type !== NODE.IDENTIFIER) {
          throw new Error("Unsupported yet");
        }
        const errorVariable = findVariableInfo(
          currentNode.catchBlock.param,
          getParentForNode(
            currentNode.catchBlock.param,
            currentNode.catchBlock.body,
            typeGraph
          )
        );
        errorVariable.type = inferenceErrorType(currentNode, typeGraph);
        addPosition(currentNode.catchBlock.param, errorVariable, typeGraph);
        break;
      case NODE.CALL_EXPRESSION:
      case NODE.RETURN_STATEMENT:
      case NODE.EXPRESSION_STATEMENT:
      case NODE.IF_STATEMENT:
      case NODE.WHILE_STATEMENT:
      case NODE.DO_WHILE_STATEMENT:
      case NODE.FOR_STATEMENT:
      case NODE.THROW_STATEMENT:
        addCallToTypeGraph(currentNode, typeGraph, currentScope);
        break;
      case NODE.OBJECT_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.CLASS_DECLARATION:
      case NODE.FUNCTION_DECLARATION:
        const functionScope = typeGraph.body.get(Scope.getName(currentNode));
        if (!(functionScope instanceof Scope)) {
          throw new Error("Never!");
        }
        if (
          functionScope.declaration instanceof VariableInfo &&
          functionScope.declaration.type instanceof GenericType &&
          functionScope.type === Scope.FUNCTION_TYPE &&
          functionScope.declaration.type.subordinateType instanceof FunctionType
        ) {
          const { declaration } = functionScope;
          // $FlowIssue - Type refinements
          inferenceFunctionTypeByScope(functionScope, typeGraph);
          checkCalls(functionScope, typeScope, errors);
          declaration.throwable = (functionScope.throwable || []).length
            ? inferenceErrorType(currentNode, typeGraph)
            : undefined;
        }
        break;
    }
  };
};

const createModuleScope = (ast: Program): [ModuleScope, Array<HegelError>] => {
  const errors: Array<HegelError> = [];
  const result = new ModuleScope();
  const typeScope = new Scope("block", result);
  result.body.set(TYPE_SCOPE, typeScope);
  result.body.set(POSITIONS, new Scope("block", result));
  mixUtilityTypes(result);
  mixBaseGlobals(result);
  mixBaseOperators(result);
  try {
    traverseTree(
      ast,
      fillModuleScope(result, errors),
      afterFillierActions(result, errors)
    );
  } catch (e) {
    if (!(e instanceof HegelError)) {
      throw e;
    }
    errors.push(e);
  }
  checkCalls(result, typeScope, errors);
  return [result, errors];
};

export default createModuleScope;
