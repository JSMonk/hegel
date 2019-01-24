// @flow
import type { Node } from "@babel/parser";

export const DECLARATION_TYPES = {
  VARIABLE_DECLARATOR: "VariableDeclarator",
  VARIABLE_DECLARATION: "VariableDeclaration",
  FUNCTION_DECLARATION: "FunctionDeclaration",
  CLASS_DECLARATION: "ClassDeclaration",
  VARIABLE_DECLARATOR: "VariableDeclarator",
  VARIABLE_DECLARATOR: "VariableDeclarator",
  TYPE_ALIAS: "TypeAlias",
  TYPE_PARAMETER: "TypeParameter",
  TYPE_PARAMETER_DECLARATION: "TypeParameterDeclaration"
};

export const STATEMENTS_TYPES = {
  BLOCK_STATEMENT: "BlockStatement",
  IF_STATEMENT: "IfStatement",
  WHILE_STATEMENT: "WhileStatement",
  DO_WHILE_STATEMENT: "DoWhileStatement",
  FOR_STATEMENT: "ForStatement"
};

export const EXPRESSIONS_TYPES = {
  FUNCTION_EXPRESSION: "FunctionExpression",
  ARROW_FUNCTION_EXPRESSION: "ArrowFunctionExpression",
  OBJECT_EXPRESSION: "ObjectExpression",
  CLASS_EXPRESSION: "ClassExpression"
};

export const OBJECT_PROPERTIES = {
  OBJECT_EXPRESSION: "ObjectExpression",
  OBJECT_METHOD: "ObjectMethod"
};

export const ANNOTATION_TYPES = {
  FUNCTION_TYPE_ANNOTATION: "FunctionTypeAnnotation",
  ANY_TYPE_ANNOTATION: "AnyTypeAnnotation",
  VOID_TYPE_ANNOTATION: "VoidTypeAnnotation",
  BOOLEAN_TYPE_ANNOTATION: "BooleanTypeAnnotation",
  MIXED_TYPE_ANNOTATION: "MixedTypeAnnotation",
  EMPTY_TYPE_ANNOTATION: "EmptyTypeAnnotation",
  NUMBER_TYPE_ANNOTATION: "NumberTypeAnnotation",
  STRING_TYPE_ANNOTATION: "StringTypeAnnotation",
  NULL_LITERAL_TYPE_ANNOTATION: "NullLiteralTypeAnnotation",
  GENERIC_TYPE_ANNOTATION: "GenericTypeAnnotation",
  NUBMER_LITERAL_TYPE_ANNOTATION: "NumberLiteralTypeAnnotation",
  BOOLEAN_LITERAL_TYPE_ANNOTATION: "BooleanLiteralTypeAnnotation",
  STRING_LITERAL_TYPE_ANNOTATION: "StringLiteralTypeAnnotation",
  OBJECT_TYPE_ANNOTATION: "ObjectTypeAnnotation",
  OBJECT_TYPE_PROPERTY: "ObjectTypeProperty",
  UNION_TYPE_ANNOTATION: "UnionTypeAnnotation",
  NULLABLE_TYPE_ANNOTATION: "NullableTypeAnnotation"
};

const INITIALIZATION_TYPES = {
  IDENTIFIER: "Identifier"
};

const DECLARATION_KINDS = {
  VAR: "var",
  CONST: "const",
  LET: "let"
};

const isUnscopableDeclaration = ({ kind }: Object) =>
  kind === DECLARATION_KINDS.VAR;

const isObject = (node: Node) =>
  node.type === OBJECT_PROPERTIES.OBJECT_EXPRESSION

const isFunction = (node: Node) =>
  [
    DECLARATION_TYPES.FUNCTION_DECLARATION,
    EXPRESSIONS_TYPES.FUNCTION_EXPRESSION,
    EXPRESSIONS_TYPES.ARROW_FUNCTION_EXPRESSION
  ].includes(node.type);

const isFunctionalProperty = (node: Node) =>
  node.type === OBJECT_PROPERTIES.OBJECT_METHOD || isFunction(node.value);

export default {
  isObject,
  isFunction,
  isFunctionalProperty,
  isUnscopableDeclaration,
  ...DECLARATION_TYPES,
  ...STATEMENTS_TYPES,
  ...ANNOTATION_TYPES,
  ...EXPRESSIONS_TYPES,
  ...INITIALIZATION_TYPES,
  ...OBJECT_PROPERTIES
};
