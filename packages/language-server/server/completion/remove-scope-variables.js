const { default: LazyIterator } = require("@sweet-monads/iterator");

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
  "from",
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

/**
 * Holds filtered variables of global scope (global classes, functions like Array, Map, parseInt).
 */
let globalVariablesCache;

// Maybe will be removed in future
function removeLanguageTokens(scope) {
  if (globalVariablesCache !== undefined) {
    return globalVariablesCache;
  } else {
    if (scope.parent === null) {
      return (globalVariablesCache = {
        ...scope,
        body: new Map(
          LazyIterator.from(scope.body.entries())
            .filter(
              ([name, info]) =>
                !OPERATOR_SYMBOLS_REGEXP.test(name) &&
                !LANGUAGE_KEYWORDS.includes(name)
            )
            .collect()
        ),
      });
    } else {
      return removeLanguageTokens(scope.parent);
    }
  }
}

exports.removeLanguageTokens = removeLanguageTokens;
