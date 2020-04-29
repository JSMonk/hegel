const { narrowDownTypes } = require("./narrow-types");
const { CompletionItemKind } = require("vscode-languageserver");
const { removeLanguageTokens } = require("./remove-scope-variables");
const {
  getPositionedModuleScopeTypes,
} = require("../validation/code-validation");

const FUNCTION_MATCHER = "=>";
const CLASS_MATCHER = "class";
const CONSTRUCTOR_MATCHER = "Constructor";

const kinds = [
  {
    itemKind: CompletionItemKind.Function,
    matcher: FUNCTION_MATCHER,
  },
  {
    itemKind(type) {
      return type.isConstant
        ? CompletionItemKind.Constant
        : CompletionItemKind.Variable;
    },
    matcher(name) {
      return (
        !name.includes(CLASS_MATCHER) &&
        !name.includes(FUNCTION_MATCHER) &&
        !name.includes(CONSTRUCTOR_MATCHER)
      );
    },
  },
  {
    itemKind: CompletionItemKind.Class,
    matcher: CLASS_MATCHER,
  },
  {
    itemKind: CompletionItemKind.Constructor,
    matcher: CONSTRUCTOR_MATCHER,
  },
];

/**
 * Find type kind of variable.
 */
function getCompletionKind(variableInfo) {
  const possibleKind = kinds.find(({ matcher }) => {
    return typeof matcher === "string"
      ? String(variableInfo.type.name).includes(matcher)
      : matcher(`${variableInfo.type.name}`);
  });

  return possibleKind
    ? typeof possibleKind.itemKind === "function"
      ? possibleKind.itemKind(variableInfo)
      : possibleKind.itemKind
    : CompletionItemKind.Text;
}

function buildCompletionItem(scope, dataIndex) {
  const completionItems = Array.from(scope.body.entries())
    // Rid of [[ScopeName01]] variables.
    .filter(([varName, varInfo]) => !varName.startsWith("[["))
    .map(([varName, varInfo], index) => ({
      label: varName,
      kind: getCompletionKind(varInfo),
      data: dataIndex + index,
    }));

  return scope.parent !== null
    ? [
        ...completionItems,
        ...buildCompletionItem(
          removeLanguageTokens(scope.parent),
          completionItems.length
        ),
      ]
    : completionItems;
}

function onCompletion(completionParams) {
  const types = getPositionedModuleScopeTypes();
  const maybeNarrowedTypes = narrowDownTypes(types, completionParams.position);

  return buildCompletionItem(maybeNarrowedTypes, 0);
}

exports.onCompletion = onCompletion;
