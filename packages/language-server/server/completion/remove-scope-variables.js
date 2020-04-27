const OPERATOR_SYMBOLS_REGEXP = /[-+=><~*%/|&^$!?:#]/;
/**
 * Keywords defined [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar)
 */
const LANGUAGE_KEYWORDS = [
  // Reserved keywords as of ECMAScript 2015
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  // Future reserved keywords
  "enum",
  "implements",
  "interface",
  "let",
  "const",
  "package",
  "private",
  "protected",
  "public",
  "static",
  // Future reserved keywords in older standards
  "abstract",
  "boolean",
  "byte",
  "char",
  "double",
  "final",
  "float",
  "goto",
  "int",
  "long",
  "native",
  "short",
  "synchronized",
  "throws",
  "transient",
  "volatile",
];

function removeLanguageTokens(scope) {
  return {
    ...scope,
    body: new Map(
      Array.from(scope.body.entries()).filter(
        ([name, info]) =>
          !OPERATOR_SYMBOLS_REGEXP.test(name) &&
          !LANGUAGE_KEYWORDS.includes(name)
      )
    ),
  };
}

exports.removeLanguageTokens = removeLanguageTokens;
