//@flow
import traverseTree from "../utils/traverse";
import NODE from "../utils/nodes";
import { Option } from "../utils/option";
import { Type, TypeInfo, Scope, Meta, ModuleScope } from "./types";
import type {
  Program,
  SourceLocation,
  Node,
  TypeAnnotation,
  Declaration
} from "@babel/parser";

const getScopeType = (node: Node): $PropertyType<Scope, "type"> => {
  switch (node.type) {
    case NODE.BLOCK_STATEMENT:
      return Scope.BLOCK_TYPE;
    case NODE.FUNCTION_DECLARATION:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
      return Scope.FUNCTION_TYPE;
    case NODE.OBJECT_EXPRESSION:
      return Scope.OBJECT_TYPE;
    case NODE.CLASS_DECLARATION:
    case NODE.CLASS_EXPRESSION:
      return Scope.CLASS_TYPE;
  }
  throw new TypeError("Never for getScopeType");
};

const getTypeFromTypeAnnotation = (typeAnnotation: ?TypeAnnotation): Type => {
  if (!typeAnnotation || !typeAnnotation.typeAnnotation) {
    return new Type("?");
  }
  switch (typeAnnotation.typeAnnotation.type) {
    case NODE.ANY_TYPE_ANNOTATION:
      return new Type("any");
    case NODE.VOID_TYPE_ANNOTATION:
      return new Type("void");
    case NODE.BOOLEAN_TYPE_ANNOTATION:
      return new Type("boolean");
    case NODE.MIXED_TYPE_ANNOTATION:
      return new Type("mixed");
    case NODE.EMPTY_TYPE_ANNOTATION:
      return new Type("empty");
    case NODE.NUMBER_TYPE_ANNOTATION:
      return new Type("number");
    case NODE.STRING_TYPE_ANNOTATION:
      return new Type("string");
    case NODE.NULL_LITERAL_TYPE_ANNOTATION:
      return new Type("null", /*isLiteral:*/ true);
    case NODE.GENERIC_TYPE_ANNOTATION:
      return new Type(typeAnnotation.typeAnnotation.id.name);
    case NODE.NUBMER_LITERAL_TYPE_ANNOTATION:
    case NODE.BOOLEAN_LITERAL_TYPE_ANNOTATION:
    case NODE.STRING_LITERAL_TYPE_ANNOTATION:
      return new Type(typeAnnotation.typeAnnotation.value, /*isLiteral:*/ true);
  }
  return new Type("?");
};
const getScopeKey = (node: Node) =>
  `[[Scope${node.loc.start.line}-${node.loc.start.column}]]`;

const getDeclarationName = (node: Declaration): string => node.id.name;

const findNearestScopeByType = (
  type: $PropertyType<Scope, "type">,
  parentContext: ModuleScope | Scope
): Scope | ModuleScope => {
  let parent = parentContext;
  while (parent instanceof Scope) {
    if (parent.type === type) {
      return parent;
    }
    parent = parent.parent;
  }
  return parent;
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

const findVariableTypeInfo = (
  name: string,
  parentContext: ModuleScope | Scope
): ?TypeInfo => {
  let parent = parentContext;
  do {
    const variableTypeInfo = parent.body.get(name);
    if (variableTypeInfo && variableTypeInfo instanceof TypeInfo) {
      return variableTypeInfo;
    }
    parent = parent.parent;
  } while (parent);
  return undefined;
};

const getRelationFromInit = (
  currentNode: Node,
  parentScope: ModuleScope | Scope
): ?Map<string, TypeInfo> => {
  if (!currentNode.init) {
    return null;
  }
  const relations = new Map();
  switch (currentNode.init.type) {
    case NODE.IDENTIFIER:
      const { name } = currentNode.init;
      const relatedVariableTypeInfo = findVariableTypeInfo(name, parentScope);
      if (!relatedVariableTypeInfo) {
        break;
      }
      relations.set(name, relatedVariableTypeInfo);
      return relations;
  }
  return null;
};

const getTypeInfoFromDelcaration = (
  currentNode: Node,
  parent: Node | ModuleScope | Scope,
  typeGraph: ModuleScope
) => {
  const parentScope =
    parent instanceof ModuleScope || parent instanceof Scope
      ? parent
      : getParentFromNode(currentNode, parent, typeGraph);
  return new TypeInfo(
    /*type:*/ getTypeFromTypeAnnotation(currentNode.id.typeAnnotation),
    parentScope,
    /*meta:*/ new Meta(currentNode.loc),
    /*relations:*/ getRelationFromInit(currentNode, parentScope)
  );
};

const getScopeFromNode = (
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  declaration?: TypeInfo
) =>
  new Scope(
    /*type:*/ getScopeType(currentNode),
    /*parent:*/ getParentFromNode(currentNode, parentNode, typeGraph),
    /* declaration */ declaration
  );

const addVariableToGraph = (
  currentNode: Node,
  parentNode: ?Node,
  typeGraph: ModuleScope
) => {
  const typeInfo = getTypeInfoFromDelcaration(
    currentNode,
    parentNode,
    typeGraph
  );
  typeInfo.parent.body.set(getDeclarationName(currentNode), typeInfo);
  return typeInfo;
};

const fillModuleScope = (typeGraph: ModuleScope) =>
  function filler(currentNode: Node, parentNode: Node | Scope | ModuleScope) {
    switch (currentNode.type) {
      case NODE.VARIABLE_DECLARATION:
        const parent = getParentFromNode(currentNode, parentNode, typeGraph);
        currentNode.declarations.forEach(node => filler(node, parent));
        break;
      case NODE.BLOCK_STATEMENT:
        if (NODE.isFunction(parentNode)) {
          return;
        }
      case NODE.CLASS_DECLARATION:
      case NODE.OBJECT_EXPRESSION:
      case NODE.CLASS_EXPRESSION:
        typeGraph.body.set(
          getScopeKey(currentNode),
          getScopeFromNode(currentNode, parentNode, typeGraph)
        );
        break;
      case NODE.VARIABLE_DECLARATOR:
      case NODE.CLASS_DECLARATION:
        addVariableToGraph(currentNode, parentNode, typeGraph);
        break;
      case NODE.FUNCTION_DECLARATION:
        const declaration = addVariableToGraph(
          currentNode,
          parentNode,
          typeGraph
        );
        typeGraph.body.set(
          getScopeKey(currentNode),
          getScopeFromNode(currentNode, parentNode, typeGraph, declaration)
        );
        break;
    }
  };

const createModuleScope = (ast: Program): ModuleScope => {
  const result = new ModuleScope();
  traverseTree(ast, fillModuleScope(result));
  return result;
};

export default createModuleScope;
