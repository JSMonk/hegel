const { getCompletionKind } = require("./completion-item-kind");
const { getGlobalScopeGraph } = require("../validation/type-definitions");
const { default: LazyIterator } = require("@sweet-monads/iterator");
const {
  getPositionedModuleScopeTypes,
} = require("../validation/code-validation");
const { narrowDownTypes, discardVariableScope } = require("./narrow-types");

const DOT_TRIGGER_KIND = 2;
const REGULAR_TRIGGER_KIND = 1;

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
          maybeGlobalScope(scope.parent),
          completionItems.length
        ),
      ]
    : completionItems;
}

/**
 * Gets cashed global type graph if scope has not parent.
 * @param {import("@hegel/core").ModuleScope} scope
 */
function maybeGlobalScope(scope) {
  return scope.parent === null ? getGlobalScopeGraph() : scope;
}

function onCompletion(completionParams) {
  if (completionParams.context.triggerKind === REGULAR_TRIGGER_KIND) {
    discardVariableScope();
  }

  const types = getPositionedModuleScopeTypes();
  const maybeNarrowedTypes =
    completionParams.context.triggerKind === DOT_TRIGGER_KIND
      ? narrowDownTypes(types, completionParams)
      : types;

  return buildCompletionItem(maybeNarrowedTypes, 0);
}

exports.onCompletion = onCompletion;
