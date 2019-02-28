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
  FOR_STATEMENT: "ForStatement",
  EXPRESSION_STATEMENT: "ExpressionStatement",
  RETURN_STATEMENT: "ReturnStatement",
  EMPTY_STATEMENT: "EmptyStatement",
  TRY_STATEMENT: "TryStatement",
  THROW_STATEMENT: "ThrowStatement",
  CATCH_CLAUSE: "CatchClause"
};

export const EXPRESSIONS_TYPES = {
  ARRAY_EXPRESSION: "ArrayExpression",
  FUNCTION_EXPRESSION: "FunctionExpression",
  ARROW_FUNCTION_EXPRESSION: "ArrowFunctionExpression",
  OBJECT_EXPRESSION: "ObjectExpression",
  CLASS_EXPRESSION: "ClassExpression",
  ASSIGNMENT_EXPRESSION: "AssignmentExpression",
  BINARY_EXPRESSION: "BinaryExpression",
  UNARY_EXPRESSION: "UnaryExpression",
  CONDITIONAL_EXPRESSION: "ConditionalExpression",
  AWAIT_EXPRESSION: "AwaitExpression",
  LOGICAL_EXPRESSION: "LogicalExpression",
  CALL_EXPRESSION: "CallExpression",
  MEMBER_EXPRESSION: "MemberExpression",
  UPDATE_EXPRESSION: "UpdateExpression",
  NEW_EXPRESSION: "NewExpression"
};

export const OBJECT_PROPERTIES = {
  OBJECT_EXPRESSION: "ObjectExpression",
  OBJECT_METHOD: "ObjectMethod",
  OBJECT_PROPERTY: "ObjectProperty"
};

export const LITERAL_TYPES = {
  NUMERIC_LITERAL: "NumericLiteral",
  STRING_LITERAL: "StringLiteral",
  BOOLEAN_LITERAL: "BooleanLiteral",
  NULL_LITERAL: "NullLiteral",
  REG_EXP_LITERAL: "RegExpLiteral"
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
  NULLABLE_TYPE_ANNOTATION: "NullableTypeAnnotation",
  TUPLE_TYPE_ANNOTATION: "TupleTypeAnnotation"
};

const INITIALIZATION_TYPES = {
  IDENTIFIER: "Identifier",
  PROGRAM: "Program"
};

const DECLARATION_KINDS = {
  VAR: "var",
  CONST: "const",
  LET: "let"
};

const isUnscopableDeclaration = ({ kind }: Object) =>
  kind === DECLARATION_KINDS.VAR;

const isObject = (node: Node) =>
  node.type === OBJECT_PROPERTIES.OBJECT_EXPRESSION;

const isScopeCreator = (node: Node) =>
  [
    INITIALIZATION_TYPES.PROGRAM,
    DECLARATION_TYPES.FUNCTION_DECLARATION,
    EXPRESSIONS_TYPES.FUNCTION_EXPRESSION,
    EXPRESSIONS_TYPES.ARROW_FUNCTION_EXPRESSION,
    ANNOTATION_TYPES.FUNCTION_TYPE_ANNOTATION,
    OBJECT_PROPERTIES.OBJECT_METHOD,
    STATEMENTS_TYPES.BLOCK_STATEMENT
  ].includes(node.type);

const isFunction = (node: Node) =>
  [
    DECLARATION_TYPES.FUNCTION_DECLARATION,
    EXPRESSIONS_TYPES.FUNCTION_EXPRESSION,
    EXPRESSIONS_TYPES.ARROW_FUNCTION_EXPRESSION,
    ANNOTATION_TYPES.FUNCTION_TYPE_ANNOTATION,
    OBJECT_PROPERTIES.OBJECT_METHOD
  ].includes(node.type);

export default {
  isObject,
  isFunction,
  isScopeCreator,
  isUnscopableDeclaration,
  ...DECLARATION_TYPES,
  ...STATEMENTS_TYPES,
  ...ANNOTATION_TYPES,
  ...EXPRESSIONS_TYPES,
  ...INITIALIZATION_TYPES,
  ...OBJECT_PROPERTIES,
  ...LITERAL_TYPES
};
