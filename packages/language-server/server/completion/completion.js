const { narrowDownTypes } = require("./narrow-types");
const { getCompletionKind } = require("./completion-item-kind");
const { removeLanguageTokens } = require("./remove-scope-variables");
const {
  getPositionedModuleScopeTypes,
} = require("../validation/code-validation");

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
