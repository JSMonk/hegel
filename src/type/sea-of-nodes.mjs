//@flow
import traverseTree from "../utils/traverse";
import { Option } from "../utils/option";
import type {
  Program,
  SourceLocation,
  Node,
  TypeAnnotation,
  Declaration
} from "@babel/parser";

type TypeInfo = {|
  type?: string,
  parent: Scope | SeaOfNodes,
  exactType?: string,
  meta: {
    filePath: string,
    loc: SourceLocation
  }
|};

type Scope = {|
  type: "block" | "function" | "object" | "class",
  parent: Scope | SeaOfNodes,
  body: SeaOfNodes
|};

type SeaOfNodesElement = Scope | TypeInfo;

type SeaOfNodes = Map<string, SeaOfNodesElement>;

const isDeclartionNode = (node: Node) =>
  [
    "VariableDeclarator",
    "VariableDeclaration",
    "FunctionDeclaration",
    "ClassDeclaration"
  ].includes(node.type);

const isScopedNode = (node: Node) =>
  [
    "BlockStatement",
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
    "ObjectExpression",
    "ClassDeclaration",
    "ClassExpression"
  ].includes(node.type);

const getScopeType = (node: Node): ?$ElementType<Scope, "type"> => {
  switch (node.type) {
    case "BlockStatement":
      return "block";
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      return "function";
    case "ObjectExpression":
      return "object";
    case "ClassDeclaration":
    case "ClassExpression":
      return "class";
  }
  throw new TypeError("Never for getScopeType");
};

const getTypeFromTypeAnnotation = (typeAnnotation: TypeAnnotation): string => {
  if (!typeAnnotation.typeAnnotation) {
    return "void";
  }
  switch (typeAnnotation.typeAnnotation.type) {
    case "AnyTypeAnnotation":
      return "any";
    case "VoidTypeAnnotation":
      return "void";
    case "BooleanTypeAnnotation":
      return "boolean";
    case "MixedTypeAnnotation":
      return "mixed";
    case "EmptyTypeAnnotation":
      return "empty";
    case "NumberTypeAnnotation":
      return "number";
    case "StringTypeAnnotation":
      return "string";
    case "NullLiteralTypeAnnotation":
      return "null";
    case "GenericTypeAnnotation":
      return typeAnnotation.typeAnnotation.id.name;
    case "NumberLiteralTypeAnnotation":
    case "BooleanLiteralTypeAnnotation":
    case "StringLiteralTypeAnnotation":
      return typeAnnotation.typeAnnotation.value;
  }
  return "?";
};

const getScopeKey = (node: Node) => `[[Scope${node.loc.start.line}-${node.loc.start.column}]]`;

const getDeclarationName = (node: Declaration): string => node.id.name;

const getParentFromNode = (
  parentNode: ?Node,
  sea: SeaOfNodes
): SeaOfNodes | Scope => {
  if (!parentNode) {
    return sea;
  }
  const name = getScopeKey(parentNode);
  const scope = sea.get(name);
  if (scope && scope.body) {
    return scope;
  }
  return sea;
};

const getTypeInfoFromDelcaration = (
  currentNode: Node,
  parentNode: Node,
  sea: SeaOfNodes
): TypeInfo => ({
  type: getTypeFromTypeAnnotation(currentNode.id.typeAnnotation),
  parent: getParentFromNode(parentNode, sea),
  meta: {
    filePath: "NONAME",
    loc: currentNode.loc
  }
});

const getScopeFromNode = (
  currentNode: Node,
  parentNode: Node,
  sea: SeaOfNodes
): Scope => ({
  type: getScopeType(currentNode) || "class",
  parent: getParentFromNode(parentNode, sea),
  body: new Map()
});

const fillSeaOfNodes = (sea: SeaOfNodes) =>
  function filler(currentNode: Node, parentNode: Node) {
    const isDeclaration = isDeclartionNode(currentNode);
    const isScope = isScopedNode(currentNode);
    if (!isDeclaration && !isScope) {
      return;
    }
    if (currentNode.type === "VariableDeclaration") {
      return currentNode.declarations.forEach(node =>
        filler(node, parentNode)
      );
    }
    if (isDeclaration) {
      const typeInfo: TypeInfo = getTypeInfoFromDelcaration(
        currentNode,
        parentNode,
        sea
      );
      const upperLevelSeaOfNodes =
        typeInfo.parent instanceof Map ? typeInfo.parent : typeInfo.parent.body;
      upperLevelSeaOfNodes.set(getDeclarationName(currentNode), typeInfo);
    } else {
      sea.set(
        getScopeKey(currentNode),
        getScopeFromNode(currentNode, parentNode, sea)
      );
    }
  };

const createSeaOfNodes = (ast: Program): SeaOfNodes => {
  const result: SeaOfNodes = new Map();
  traverseTree(ast, fillSeaOfNodes(result));
  return result;
};

export default createSeaOfNodes;
