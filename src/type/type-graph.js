//@flow
import traverseTree from "../utils/traverse";
import NODE from "../utils/nodes";
import { Option } from "../utils/option";
import {
  Type,
  FunctionType,
  TypeInfo,
  Scope,
  Meta,
  ModuleScope
} from "./types";
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
    case NODE.OBJECT_METHOD:
      return Scope.FUNCTION_TYPE;
    case NODE.OBJECT_EXPRESSION:
      return Scope.OBJECT_TYPE;
    case NODE.CLASS_DECLARATION:
    case NODE.CLASS_EXPRESSION:
      return Scope.CLASS_TYPE;
  }
  throw new TypeError("Never for getScopeType");
};

const getNameForType = (type: Type): string =>
  typeof type.name === "string" && type.isLiteral && type.properties.size === 0
    ? `'${String(type.name)}'`
    : String(type.name);

const getFunctionTypeLiteral = (params: Array<Type>, returnType: Type) =>
  `(${params.map(getNameForType).join(", ")}) => ${String(returnType.name)}`;

const getObjectTypeLiteral = (params: Array<[string, Type]>) =>
  `{ ${params
    .sort(([name1], [name2]) => name1.charCodeAt(0) - name2.charCodeAt(0))
    .map(([name, type]) => `${name}: ${getNameForType(type)}`)
    .join(", ")} }`;

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
      return new Type(null, { isLiteral: true });
    case NODE.GENERIC_TYPE_ANNOTATION:
      return new Type(typeAnnotation.typeAnnotation.id.name);
    case NODE.NUBMER_LITERAL_TYPE_ANNOTATION:
    case NODE.BOOLEAN_LITERAL_TYPE_ANNOTATION:
    case NODE.STRING_LITERAL_TYPE_ANNOTATION:
      return new Type(typeAnnotation.typeAnnotation.value, { isLiteral: true });
    case NODE.FUNCTION_TYPE_ANNOTATION:
      const args = typeAnnotation.typeAnnotation.params.map(
        getTypeFromTypeAnnotation
      );
      const returnType = getTypeFromTypeAnnotation({
        typeAnnotation: typeAnnotation.typeAnnotation.returnType
      });
      return new FunctionType(
        getFunctionTypeLiteral(args, returnType),
        args,
        returnType
      );
    case NODE.OBJECT_TYPE_ANNOTATION:
      const { typeAnnotation: annotation } = typeAnnotation;
      const params = typeAnnotation.typeAnnotation.properties.map(
        ({ value: typeAnnotation, key }) => [
          key.name,
          getTypeFromTypeAnnotation({ typeAnnotation })
        ]
      );
      const objectName = getObjectTypeLiteral(params);
      return new Type(
        objectName,
        { isLiteral: true },
        params.map(([name, type], index) => [
          name,
          new TypeInfo(
            type,
            undefined,
            new Meta(annotation.properties[index].loc)
          )
        ])
      );
  }
  return new Type("?");
};

const getTypeFromInit = (
  currentInit: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  defaultType: Type
): Type => {
  switch (currentInit.type) {
    case NODE.OBJECT_EXPRESSION:
      return new Type(
        "?",
        { isLiteral: true },
        currentInit.properties.reduce(
          (types, field) =>
            types.concat([
              [
                field.key.name,
                getTypeInfoFromDelcaration(
                  field.value || field,
                  parentNode,
                  typeGraph
                )
              ]
            ]),
          []
        )
      );
    default:
      return defaultType;
  }
};

const getTypeForNode = (
  currentNode: Node,
  typeGraph: ModuleScope,
  parentNode?: Node | ModuleScope | Scope = currentNode
): Type => {
  const typeAnnotation = currentNode.id && currentNode.id.typeAnnotation;
  const defaultType = getTypeFromTypeAnnotation(typeAnnotation);
  if (typeAnnotation) {
    return defaultType;
  }
  switch (currentNode.type) {
    case NODE.OBJECT_EXPRESSION:
      return getTypeFromInit(currentNode, parentNode, typeGraph, defaultType);
    case NODE.VARIABLE_DECLARATOR:
      return getTypeFromInit(
        currentNode.init,
        parentNode,
        typeGraph,
        defaultType
      );
    case NODE.OBJECT_METHOD:
    case NODE.FUNCTION_DECLARATION:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
      const params = currentNode.params.map(a =>
        getTypeFromTypeAnnotation(a.typeAnnotation)
      );
      const returnType = getTypeFromTypeAnnotation(currentNode.returnType);
      return new FunctionType(
        getFunctionTypeLiteral(params, returnType),
        params,
        returnType
      );
    default:
      return defaultType;
  }
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
    /*type:*/ getTypeForNode(currentNode, typeGraph, parent),
    parentScope,
    /*meta:*/ new Meta(currentNode.loc),
    /*relations:*/ getRelationFromInit(currentNode, parentScope)
  );
};

const getScopeFromNode = (
  currentNode: Node,
  parentNode: Node | ModuleScope | Scope,
  typeGraph: ModuleScope,
  declaration?: TypeInfo
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
  const typeInfo = getTypeInfoFromDelcaration(
    currentNode,
    parentNode,
    typeGraph
  );
  typeInfo.parent.body.set(customName, typeInfo);
  return typeInfo;
};

type FunctionMeta = {
  type?: FunctionType,
  name?: string
};

const addFunctionScopeToTypeGraph = (
  currentNode: Node,
  parentNode: Node | Scope | ModuleScope,
  typeGraph: ModuleScope,
  typeInfo: TypeInfo
) => {
  const scope = getScopeFromNode(currentNode, parentNode, typeGraph, typeInfo);
  typeGraph.body.set(getScopeKey(currentNode), scope);
  if (currentNode.type === NODE.FUNCTION_EXPRESSION && currentNode.id) {
    scope.body.set(getDeclarationName(currentNode), typeInfo);
  }
};

const addFunctionToTypeGraph = (
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  meta: FunctionMeta
) => {
  const typeInfo = addVariableToGraph(
    currentNode,
    parentNode,
    typeGraph,
    meta.name
  );
  if (meta.type) {
    typeInfo.type = meta.type;
  }
  addFunctionScopeToTypeGraph(currentNode, parentNode, typeGraph, typeInfo);
};

const addObjectMethodToGraph = (
  currentNode: Node,
  parentNode: Node | Scope | ModuleScope,
  typeGraph: ModuleScope,
  objectTypeInfo: TypeInfo
): void => {
  currentNode.properties.forEach(field => {
    const declaration = objectTypeInfo.type.properties.get(field.key.name);
    if (!declaration) {
      return;
    }
    if (NODE.isFunctionalProperty(field)) {
      return addFunctionScopeToTypeGraph(
        field.value || field,
        currentNode,
        typeGraph,
        declaration
      );
    }
    if (NODE.isObject(field.value)) {
      return addObjectMethodToGraph(
        field.value,
        currentNode,
        typeGraph,
        declaration
      );
    }
  });
};

const fillModuleScope = (typeGraph: ModuleScope) =>
  function filler(
    currentNode: Node,
    parentNode: Node | Scope | ModuleScope,
    meta?: Object = {}
  ) {
    switch (currentNode.type) {
      case NODE.VARIABLE_DECLARATION:
        const parent = getParentFromNode(currentNode, parentNode, typeGraph);
        currentNode.declarations.forEach(node => filler(node, parent, meta));
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
      case NODE.VARIABLE_DECLARATOR:
        if (NODE.isFunction(currentNode.init)) {
          return filler(currentNode.init, parentNode, {
            name: currentNode.id.name,
            type: currentNode.id.typeAnnotation
              ? getTypeFromTypeAnnotation(currentNode.id.typeAnnotation)
              : null
          });
        }
        if (NODE.isObject(currentNode.init)) {
          const objectTypeInfo = addVariableToGraph(
            currentNode,
            parentNode,
            typeGraph
          );
          addObjectMethodToGraph(
            currentNode.init,
            parentNode,
            typeGraph,
            objectTypeInfo
          );
          return;
        }
        addVariableToGraph(currentNode, parentNode, typeGraph);
        break;
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.CLASS_DECLARATION:
      case NODE.FUNCTION_DECLARATION:
        addFunctionToTypeGraph(currentNode, parentNode, typeGraph, meta);
        break;
    }
  };

const createModuleScope = (ast: Program): ModuleScope => {
  const result = new ModuleScope();
  traverseTree(ast, fillModuleScope(result));
  return result;
};

export default createModuleScope;
