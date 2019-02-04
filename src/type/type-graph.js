// @flow
import type {
  Program,
  SourceLocation,
  Node,
  TypeAnnotation,
  TypeParameter,
  Declaration
} from "@babel/parser";
import traverseTree from "../utils/traverse";
import NODE from "../utils/nodes";
import mixBaseGlobals from "../utils/globals";
import mixBaseOperators from "../utils/operators";
import {
  getInvocationType,
  inferenceTypeForNode,
  inferenceFunctionTypeByScope
} from "../inference";
import {
  getScopeKey,
  getNameForType,
  getAnonymousKey,
  findVariableInfo,
  getDeclarationName,
  findNearestTypeScope,
  findNearestScopeByType,
  getTypeFromTypeAnnotation,
  getFunctionTypeLiteral
} from "../utils/utils";
import {
  Type,
  TypeVar,
  CallMeta,
  ObjectType,
  FunctionType,
  GenericType,
  VariableInfo,
  Scope,
  Meta,
  ModuleScope,
  TYPE_SCOPE,
  UNDEFINED_TYPE
} from "./types";
import type { TraverseMeta } from "../utils/traverse";
import type { CallableArguments } from "./types";

const getScopeType = (node: Node): $PropertyType<Scope, "type"> => {
  switch (node.type) {
    case NODE.BLOCK_STATEMENT:
      return Scope.BLOCK_TYPE;
    case NODE.FUNCTION_DECLARATION:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.OBJECT_METHOD:
    case NODE.FUNCTION_TYPE_ANNOTATION:
      return Scope.FUNCTION_TYPE;
    case NODE.OBJECT_EXPRESSION:
      return Scope.OBJECT_TYPE;
    case NODE.CLASS_DECLARATION:
    case NODE.CLASS_EXPRESSION:
      return Scope.CLASS_TYPE;
  }
  throw new TypeError("Never for getScopeType");
};

const getTypeScope = (scope: Scope | ModuleScope): Scope => {
  const typeScope = scope.body.get(TYPE_SCOPE);
  if (typeScope instanceof Scope) {
    return typeScope;
  }
  if (scope.parent) {
    return getTypeScope(scope.parent);
  }
  throw new TypeError("Never");
};

const addCallToTypeGraph = (
  node: Node,
  typeGraph: ModuleScope,
  currentScope: Scope | ModuleScope
): CallableArguments => {
  let target: ?VariableInfo = null;
  let targetName: string = "";
  let args: ?Array<CallableArguments> = null;
  const typeScope = findNearestTypeScope(currentScope, typeGraph);
  if (!(typeScope instanceof Scope)) {
    throw new Error("Never!");
  }
  switch (node.type) {
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.CLASS_DECLARATION:
    case NODE.IDENTIFIER:
      const nodeName =
        node.type === NODE.IDENTIFIER ? node : { name: getAnonymousKey(node) };
      return findVariableInfo(nodeName, currentScope);
    case NODE.VARIABLE_DECLARATOR:
      const variableType = findVariableInfo(node.id, currentScope);
      if (!node.init) {
        return variableType;
      }
      args = [
        variableType,
        addCallToTypeGraph(node.init, typeGraph, currentScope)
      ];
      targetName = "=";
      target = findVariableInfo({ name: targetName }, currentScope);
      break;
    case NODE.EXPRESSION_STATEMENT:
      return addCallToTypeGraph(node.expression, typeGraph, currentScope);
    case NODE.RETURN_STATEMENT:
    case NODE.UNARY_EXPRESSION:
      args = [addCallToTypeGraph(node.argument, typeGraph, currentScope)];
      targetName = node.operator || "return";
      target = findVariableInfo({ name: targetName }, currentScope);
      break;
    case NODE.BINARY_EXPRESSION:
    case NODE.LOGICAL_EXPRESSION:
      args = [
        addCallToTypeGraph(node.left, typeGraph, currentScope),
        addCallToTypeGraph(node.right, typeGraph, currentScope)
      ];
      targetName = node.operator;
      target = findVariableInfo({ name: targetName }, currentScope);
      break;
    case NODE.ASSIGNMENT_EXPRESSION:
      args = [
        addCallToTypeGraph(node.left, typeGraph, currentScope),
        addCallToTypeGraph(node.right, typeGraph, currentScope)
      ];
      targetName = node.operator;
      target = findVariableInfo({ name: targetName }, currentScope);
      break;
    case NODE.MEMBER_EXPRESSION:
      args = [
        addCallToTypeGraph(node.object, typeGraph, currentScope),
        new Type(node.name, {
          isLiteralOf: Type.createTypeWithName(
            "string",
            typeGraph.body.get(TYPE_SCOPE)
          )
        })
      ];
      targetName = ".";
      target = findVariableInfo({ name: targetName }, currentScope);
      break;
    case NODE.CONDITIONAL_EXPRESSION:
      args = [
        addCallToTypeGraph(node.test, typeGraph, currentScope),
        addCallToTypeGraph(node.conseqent, typeGraph, currentScope),
        addCallToTypeGraph(node.alternate, typeGraph, currentScope)
      ];
      targetName = "?:";
      target = findVariableInfo({ name: targetName }, currentScope);
      break;
    case NODE.CALL_EXPRESSION:
      args = node.arguments.map(n =>
        addCallToTypeGraph(n, typeGraph, currentScope)
      );
      target =
        node.callee.type === NODE.IDENTIFIER
          ? findVariableInfo(node.callee, currentScope)
          : (addCallToTypeGraph(node.callee, typeGraph, currentScope): any);
      break;
    default:
      return inferenceTypeForNode(node, typeScope, currentScope, typeGraph);
  }
  const callsScope =
    currentScope.type === Scope.FUNCTION_TYPE
      ? currentScope
      : findNearestScopeByType(Scope.FUNCTION_TYPE, currentScope);
  if (
    target.type instanceof FunctionType ||
    (target.type instanceof GenericType &&
      target.type.subordinateType instanceof FunctionType)
  ) {
    const callMeta = new CallMeta((target: any), args, node.loc, targetName);
    callsScope.calls.push(callMeta);
    return getInvocationType(
      (target.type: any),
      args.map(a => (a instanceof Type ? a : a.type))
    );
  }
  throw new Error(target.constructor.name);
};

const getParentFromNode = (
  currentNode: Node,
  parentNode: ?Node,
  typeGraph: ModuleScope
): ModuleScope | Scope => {
  if (!parentNode) {
    return typeGraph;
  }
  const name = getScopeKey(parentNode);
  const scope = typeGraph.body.get(name);
  if (!(scope instanceof Scope)) {
    return typeGraph;
  }
  if (NODE.isUnscopableDeclaration(currentNode)) {
    return findNearestScopeByType(Scope.FUNCTION_TYPE, scope || typeGraph);
  }
  return scope;
};

const getVariableInfoFromDelcaration = (
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope
) => {
  const parentScope = getParentFromNode(currentNode, parentNode, typeGraph);
  const currentTypeScope = findNearestTypeScope(parentScope, typeGraph);
  const annotatedType = getTypeFromTypeAnnotation(
    currentNode.id && currentNode.id.typeAnnotation,
    currentTypeScope
  );
  return new VariableInfo(
    /*type:*/ annotatedType,
    parentScope,
    /*meta:*/ new Meta(currentNode.loc)
  );
};

const getScopeFromNode = (
  currentNode: Node,
  parentNode: Node | ModuleScope | Scope,
  typeGraph: ModuleScope,
  declaration?: VariableInfo
) =>
  new Scope(
    /*type:*/ getScopeType(currentNode),
    /*parent:*/ parentNode instanceof Scope || parentNode instanceof ModuleScope
      ? parentNode
      : getParentFromNode(currentNode, parentNode, typeGraph),
    /* declaration */ declaration
  );

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
  typeGraph.body.set(getScopeKey(currentNode), scope);
  if (currentNode.type === NODE.FUNCTION_EXPRESSION && currentNode.id) {
    scope.body.set(getDeclarationName(currentNode), variableInfo);
  }
  const functionType =
    variableInfo.type instanceof GenericType
      ? variableInfo.type.subordinateType
      : variableInfo.type;
  currentNode.params.forEach((id, index) => {
    const type = (functionType: any).argumentsTypes[index];
    scope.body.set(id.name, new VariableInfo(type, scope, new Meta(id.loc)));
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

const fillModuleScope = (typeGraph: ModuleScope) => {
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
      case NODE.BLOCK_STATEMENT:
        if (NODE.isFunction(parentNode)) {
          return;
        }
      case NODE.CLASS_DECLARATION:
      case NODE.CLASS_EXPRESSION:
        typeGraph.body.set(
          getScopeKey(currentNode),
          getScopeFromNode(currentNode, parentNode, typeGraph)
        );
        break;
      case NODE.OBJECT_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.CLASS_DECLARATION:
      case NODE.FUNCTION_DECLARATION:
        addFunctionToTypeGraph(currentNode, parentNode, typeGraph);
        break;
    }
  };
};

const afterFillierActions = (typeGraph: ModuleScope) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!typeScope || !(typeScope instanceof Scope)) {
    throw new Error("Type scope is not a scope.");
  }
  return (
    currentNode: Node,
    parentNode: Node | Scope | ModuleScope,
    meta?: Object = {}
  ) => {
    const currentScope = getParentFromNode(currentNode, parentNode, typeGraph);
    switch (currentNode.type) {
      case NODE.RETURN_STATEMENT:
      case NODE.EXPRESSION_STATEMENT:
        addCallToTypeGraph(
          currentNode,
          typeGraph,
          getParentFromNode(currentNode, parentNode, typeGraph)
        );
        break;
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
      case NODE.OBJECT_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.CLASS_DECLARATION:
      case NODE.FUNCTION_DECLARATION:
        const functionScope = typeGraph.body.get(getScopeKey(currentNode));
        if (!(functionScope instanceof Scope)) {
          throw new Error("Never!");
        }
        if (
          functionScope.declaration instanceof VariableInfo &&
          functionScope.declaration.type instanceof GenericType &&
          functionScope.type === Scope.FUNCTION_TYPE &&
          functionScope.declaration.type.subordinateType instanceof FunctionType
        ) {
          // $FlowIssue - Type refinements
          inferenceFunctionTypeByScope(functionScope, typeGraph);
        }
        break;
    }
  };
};

const createModuleScope = (ast: Program): ModuleScope => {
  const result = new ModuleScope();
  const typeScope = new Scope("block", result);
  result.body.set(TYPE_SCOPE, typeScope);
  mixBaseGlobals(result);
  mixBaseOperators(result);
  traverseTree(ast, fillModuleScope(result), afterFillierActions(result));
  return result;
};

export default createModuleScope;
