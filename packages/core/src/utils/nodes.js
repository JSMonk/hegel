// @flow
import type { Node } from "@babel/parser";

export const DECLARATION_TYPES = {
  VARIABLE_DECLARATOR: "VariableDeclarator",
  VARIABLE_DECLARATION: "VariableDeclaration",
  FUNCTION_DECLARATION: "FunctionDeclaration",
  TS_FUNCTION_DECLARATION: "TSDeclareFunction",
  TS_CALL_SIGNATURE_DECLARATION: "TSCallSignatureDeclaration",
  TS_TYPE_QUERY: "TSTypeQuery",
  CLASS_DECLARATION: "ClassDeclaration",
  VARIABLE_DECLARATOR: "VariableDeclarator",
  VARIABLE_DECLARATOR: "VariableDeclarator",
  TYPE_ALIAS: "TypeAlias",
  TS_TYPE_ALIAS: "TSTypeAliasDeclaration",
  TS_DECLARE_METHOD: "TSDeclareMethod",
  TS_INTERFACE_DECLARATION: "TSInterfaceDeclaration",
  INTERFACE_DECLARATION: "InterfaceDeclaration",
  TYPE_PARAMETER: "TypeParameter",
  TYPE_PARAMETER_DECLARATION: "TypeParameterDeclaration",
  TS_TYPE_PARAMETER_DECLARATION: "TSTypeParameterDeclaration",
  TS_TYPE_PARAMETER: "TSTypeParameter",
  EXPORT_LIST: "ExportList",
  EXPORT_SPECIFIER: "ExportSpecifier",
  EXPORT_NAMED_DECLARATION: "ExportNamedDeclaration",
  EXPORT_DEFAULT_DECLARATION: "ExportDefaultDeclaration",
  IMPORT_DECLARATION: "ImportDeclaration"
};

export const STATEMENTS_TYPES = {
  PURE_KEY: "PureKeyStatement",
  PURE_VALUE: "PureValueStatement",
  VALUE: "WeakValueStatement",
  BLOCK_STATEMENT: "BlockStatement",
  IF_STATEMENT: "IfStatement",
  WHILE_STATEMENT: "WhileStatement",
  DO_WHILE_STATEMENT: "DoWhileStatement",
  FOR_STATEMENT: "ForStatement",
  FOR_IN_STATEMENT: "ForInStatement",
  FOR_OF_STATEMENT: "ForOfStatement",
  EXPRESSION_STATEMENT: "ExpressionStatement",
  RETURN_STATEMENT: "ReturnStatement",
  EMPTY_STATEMENT: "EmptyStatement",
  TRY_STATEMENT: "TryStatement",
  THROW_STATEMENT: "ThrowStatement",
  BREAK_STATEMENT: "BreakStatement",
  CONTINUE_STATEMENT: "ContinueStatement",
  CATCH_CLAUSE: "CatchClause",
  SWITCH_STATEMENT: "SwitchStatement",
  SWITCH_CASE: "SwitchCase",
  INTERPRETER_DIRECTIVE: "InterpreterDirective"
};

export const EXPRESSIONS_TYPES = {
  SUPER: "Super",
  ARRAY_EXPRESSION: "ArrayExpression",
  TAGGED_TEMPLATE_EXPRESSION: "TaggedTemplateExpression",
  SEQUENCE_EXPRESSION: "SequenceExpression",
  FUNCTION_EXPRESSION: "FunctionExpression",
  ARROW_FUNCTION_EXPRESSION: "ArrowFunctionExpression",
  OBJECT_EXPRESSION: "ObjectExpression",
  CLASS_EXPRESSION: "ClassExpression",
  ASSIGNMENT_EXPRESSION: "AssignmentExpression",
  TS_EXPORT_ASSIGNMENT: "TSExportAssignment",
  ASSIGNMENT_PATTERN: "AssignmentPattern",
  BINARY_EXPRESSION: "BinaryExpression",
  UNARY_EXPRESSION: "UnaryExpression",
  CONDITIONAL_EXPRESSION: "ConditionalExpression",
  AWAIT_EXPRESSION: "AwaitExpression",
  LOGICAL_EXPRESSION: "LogicalExpression",
  CALL_EXPRESSION: "CallExpression",
  MEMBER_EXPRESSION: "MemberExpression",
  UPDATE_EXPRESSION: "UpdateExpression",
  NEW_EXPRESSION: "NewExpression",
  THIS_EXPRESSION: "ThisExpression",
  TS_EXPRESSION_WITH_TYPE_ARGUMENTS: "TSExpressionWithTypeArguments",
  REST_ELEMENT: "RestElement",
  SPREAD_ELEMENT: "SpreadElement"
};

export const OBJECT_PROPERTIES = {
  OBJECT_METHOD: "ObjectMethod",
  TS_OBJECT_METHOD: "TSMethodSignature",
  OBJECT_PROPERTY: "ObjectProperty",
  TS_OBJECT_PROPERTY: "TSPropertySignature",
  TS_INDEX_PROPERTY: "TSIndexSignature",
  OBJECT_TYPE_INDEXER: "ObjectTypeIndexer",
  TS_CONSTRUCT_SIGNATURE_DECLARATION: "TSConstructSignatureDeclaration"
};

export const CLASS_PROPERTIES = {
  CLASS_METHOD: "ClassMethod",
  CLASS_PRIVATE_METHOD: "ClassPrivateMethod",
  CLASS_PROPERTY: "ClassProperty",
  CLASS_PRIVATE_PROPERTY: "ClassPrivateProperty",
  PRIVATE_NAME: "PrivateName"
};

export const LITERAL_TYPES = {
  NUMERIC_LITERAL: "NumericLiteral",
  BIGINT_LITERAL: "BigIntLiteral",
  STRING_LITERAL: "StringLiteral",
  BOOLEAN_LITERAL: "BooleanLiteral",
  NULL_LITERAL: "NullLiteral",
  REG_EXP_LITERAL: "RegExpLiteral",
  TS_LITERAL_TYPE: "TSLiteralType",
  TEMPLATE_LITERAL: "TemplateLiteral"
};

export const ANNOTATION_TYPES = {
  FUNCTION_TYPE_ANNOTATION: "FunctionTypeAnnotation",
  CLASS_IMPLEMENTS: "ClassImplements",
  ANY_TYPE_ANNOTATION: "AnyTypeAnnotation",
  VOID_TYPE_ANNOTATION: "VoidTypeAnnotation",
  BOOLEAN_TYPE_ANNOTATION: "BooleanTypeAnnotation",
  MIXED_TYPE_ANNOTATION: "MixedTypeAnnotation",
  EMPTY_TYPE_ANNOTATION: "EmptyTypeAnnotation",
  NUMBER_TYPE_ANNOTATION: "NumberTypeAnnotation",
  STRING_TYPE_ANNOTATION: "StringTypeAnnotation",
  NULL_LITERAL_TYPE_ANNOTATION: "NullLiteralTypeAnnotation",
  GENERIC_TYPE_ANNOTATION: "GenericTypeAnnotation",
  NUMBER_LITERAL_TYPE_ANNOTATION: "NumberLiteralTypeAnnotation",
  BOOLEAN_LITERAL_TYPE_ANNOTATION: "BooleanLiteralTypeAnnotation",
  STRING_LITERAL_TYPE_ANNOTATION: "StringLiteralTypeAnnotation",
  OBJECT_TYPE_ANNOTATION: "ObjectTypeAnnotation",
  OBJECT_TYPE_PROPERTY: "ObjectTypeProperty",
  OBJECT_TYPE_SPREAD_PROPERTY: "ObjectTypeSpreadProperty",
  UNION_TYPE_ANNOTATION: "UnionTypeAnnotation",
  NULLABLE_TYPE_ANNOTATION: "NullableTypeAnnotation",
  TUPLE_TYPE_ANNOTATION: "TupleTypeAnnotation",
  BIGINT_LITERAL_TYPE_ANNOTATION: "BigIntLiteralTypeAnnotation",
  TS_PARENTHESIZED_TYPE: "TSParenthesizedType",
  TS_FUNCTION_TYPE_ANNOTATION: "TSFunctionType",
  TS_ANY_TYPE_ANNOTATION: "TSAnyKeyword",
  SYMBOL_TYPE_ANNOTATION: "SymbolTypeAnnotation",
  TS_SYMBOL_TYPE_ANNOTATION: "TSSymbolKeyword",
  TS_VOID_TYPE_ANNOTATION: "TSVoidKeyword",
  TS_BOOLEAN_TYPE_ANNOTATION: "TSBooleanKeyword",
  TS_UNKNOWN_TYPE_ANNOTATION: "TSUnknownKeyword",
  TS_NEVER_TYPE_ANNOTATION: "TSNeverKeyword",
  TS_NUMBER_TYPE_ANNOTATION: "TSNumberKeyword",
  TS_BIGINT_TYPE_ANNOTATION: "TSBigIntKeyword",
  TS_STRING_TYPE_ANNOTATION: "TSStringKeyword",
  TS_NULL_LITERAL_TYPE_ANNOTATION: "TSNullKeyword",
  TS_OBJECT_KEYWORD: "TSObjectKeyword",
  TS_TYPE_OPERATOR: "TSTypeOperator",
  TS_GENERIC_TYPE_ANNOTATION: "TSTypeReference",
  TS_OBJECT_TYPE_ANNOTATION: "TSTypeLiteral",
  TS_UNION_TYPE_ANNOTATION: "TSUnionType",
  TS_TUPLE_TYPE_ANNOTATION: "TSTupleType",
  TS_TYPE_ANNOTATION: "TSTypeAnnotation",
  TS_TYPE_REFERENCE_ANNOTATION: "TSTypeReference",
  THIS_TYPE_ANNOTATION: "ThisTypeAnnotation",
  TS_THIS_TYPE_ANNOTATION: "TSThisType",
  TS_UNDEFINED_TYPE_ANNOTATION: "TSUndefinedKeyword",
  TS_ARRAY_TYPE_ANNOTATION: "TSArrayType",
  ARRAY_TYPE_ANNOTATION: "ArrayTypeAnnotation",
  TS_INTERSECTION_TYPE: "TSIntersectionType",
  TYPEOF_TYPE_ANNOTATION: "TypeofTypeAnnotation",
  TYPE_CAST: "TypeCastExpression",
  TYPE_GUARD: "TSTypePredicate"
};

export const INITIALIZATION_TYPES = {
  IDENTIFIER: "Identifier",
  PROGRAM: "Program"
};

export const DECLARATION_KINDS = {
  VAR: "var",
  CONST: "const",
  LET: "let"
};

export const SPECIFIERS_TYPES = {
  IMPORT_DEFAULT_SPECIFIER: "ImportDefaultSpecifier",
  IMPORT_NAMESPACE_SPECIFIER: "ImportNamespaceSpecifier",
  IMPORT_SPECIFIER: "ImportSpecifier"
};

export const SPECIAL_TYPES = {
  THIS_TYPE_DEFINITION: "ThisTypeDefinition"
};

export const isUnscopableDeclaration = ({ kind }: Object) =>
  kind === DECLARATION_KINDS.VAR;

export const isObject = (node: Node) =>
  node.type === EXPRESSIONS_TYPES.OBJECT_EXPRESSION;

export const isScopeCreator = (node: Node) =>
  [
    INITIALIZATION_TYPES.PROGRAM,
    OBJECT_PROPERTIES.OBJECT_METHOD,
    CLASS_PROPERTIES.CLASS_METHOD,
    DECLARATION_TYPES.CLASS_DECLARATION,
    EXPRESSIONS_TYPES.CLASS_EXPRESSION,
    EXPRESSIONS_TYPES.OBJECT_EXPRESSION,
    STATEMENTS_TYPES.BLOCK_STATEMENT,
    EXPRESSIONS_TYPES.FUNCTION_EXPRESSION,
    DECLARATION_TYPES.FUNCTION_DECLARATION,
    ANNOTATION_TYPES.FUNCTION_TYPE_ANNOTATION,
    EXPRESSIONS_TYPES.ARROW_FUNCTION_EXPRESSION
  ].includes(node.type);

export const isFunction = (node: Node) =>
  [
    DECLARATION_TYPES.FUNCTION_DECLARATION,
    EXPRESSIONS_TYPES.FUNCTION_EXPRESSION,
    EXPRESSIONS_TYPES.ARROW_FUNCTION_EXPRESSION,
    ANNOTATION_TYPES.FUNCTION_TYPE_ANNOTATION,
    OBJECT_PROPERTIES.OBJECT_METHOD,
    CLASS_PROPERTIES.CLASS_METHOD
  ].includes(node.type);

export const isImport = (node: Node) =>
  node.type === DECLARATION_TYPES.IMPORT_DECLARATION;

export default {
  isImport,
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
  ...CLASS_PROPERTIES,
  ...LITERAL_TYPES,
  ...SPECIFIERS_TYPES,
  ...SPECIAL_TYPES
};
