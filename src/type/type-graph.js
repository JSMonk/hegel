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

const getTypeFromTypeAnnotation = (typeAnnotation: TypeAnnotation): Type => {
  if (!typeAnnotation.typeAnnotation) {
    return new Type("void");
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

const getParentFromNode = (
  parentNode: ?Node,
  typeGraph: ModuleScope
): ModuleScope | Scope => {
  if (!parentNode) {
    return typeGraph;
  }
  const name = getScopeKey(parentNode);
  const scope = typeGraph.body.get(name);
  if (scope instanceof Scope) {
    return scope;
  }
  return typeGraph;
};

const getTypeInfoFromDelcaration = (
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope
) =>
  new TypeInfo(
    /*type:*/ getTypeFromTypeAnnotation(currentNode.id.typeAnnotation),
    /*parent:*/ getParentFromNode(parentNode, typeGraph),
    /*meta:*/ new Meta(currentNode.loc)
  );

const getScopeFromNode = (
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope
) =>
  new Scope(
    /*type:*/ getScopeType(currentNode),
    /*parent:*/ getParentFromNode(parentNode, typeGraph)
  );

const fillModuleScope = (typeGraph: ModuleScope) =>
  function filler(currentNode: Node, parentNode: Node) {
    switch (currentNode.type) {
      case NODE.VARIABLE_DECLARATION:
        currentNode.declarations.forEach(node => filler(node, parentNode));
        break;
      case NODE.BLOCK_STATEMENT:
      case NODE.CLASS_DECLARATION:
      case NODE.OBJECT_EXPRESSION:
      case NODE.CLASS_EXPRESSION:
        typeGraph.body.set(
          getScopeKey(currentNode),
          getScopeFromNode(currentNode, parentNode, typeGraph)
        );
        break;
      case NODE.VARIABLE_DECLARATOR:
      case NODE.FUNCTION_DECLARATION:
      case NODE.CLASS_DECLARATION:
        const typeInfo = getTypeInfoFromDelcaration(
          currentNode,
          parentNode,
          typeGraph
        );
        typeInfo.parent.body.set(getDeclarationName(currentNode), typeInfo);
    }
  };

const createModuleScope = (ast: Program): ModuleScope => {
  const result = new ModuleScope();
  traverseTree(ast, fillModuleScope(result));
  return result;
};

export default createModuleScope;
