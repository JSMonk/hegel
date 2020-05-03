const { narrowDownTypes } = require("./narrow-types");
const { getCompletionKind } = require("./completion-item-kind");
const { removeLanguageTokens } = require("./remove-scope-variables");
const { default: LazyIterator } = require("@sweet-monads/iterator");
const {
  getPositionedModuleScopeTypes,
} = require("../validation/code-validation");

function buildCompletionItem(scope, dataIndex) {
  /** This is possible when Hegel tries to find types in unappropriate variables. */
  if (scope.body === undefined) {
    return [];
  }

  const completionItems = LazyIterator.from(scope.body.entries())
    /** Rid of [[ScopeName01]] variables. */
    .filter(([varName, varInfo]) => !varName.startsWith("[["))
    .map(([varName, varInfo], index) => ({
      label: varName,
      kind: getCompletionKind(varInfo),
      data: dataIndex + index,
    }))
    .collect();

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
