const { CompletionItemKind } = require("vscode-languageserver");
const {
  getPositionedModuleScopeTypes,
} = require("../validation/code_validation");

async function onCompletion(completionParams) {
  const types = getPositionedModuleScopeTypes();

  const completionItems = [];

  if (types && types.body) {
    completionItems.push(...buildCompletionItem(types, 1));
  }

  return completionItems;
}

function buildCompletionItem(scope, dataIndex) {
  const completionItems = [];

  for (const [name, variableInfo] of scope.body.entries()) {
    completionItems.push({
      label: name,
      kind: getCompletionKind(variableInfo),
      data: dataIndex++,
    });
  }

  if (scope.parent !== null) {
    completionItems.push(...buildCompletionItem(scope.parent, dataIndex++));
  }

  return completionItems;
}

/**
 * Find type kind of variable.
 */
function getCompletionKind(variableInfo) {
  const kinds = [
    {
      itemKind: CompletionItemKind.Function,
      regexpOrFn: /=>/,
    },
    {
      itemKind(type) {
        return type.isConstant
          ? CompletionItemKind.Constant
          : CompletionItemKind.Variable;
      },
      regexpOrFn(name) {
        return typeof name !== "object" && typeof name !== "function";
      },
    },
    {
      itemKind: CompletionItemKind.Class,
      regexpOrFn: /class/,
    },
  ];

  const possibleKind = kinds.find(({ regexpOrFn }) => {
    return regexpOrFn instanceof RegExp
      ? regexpOrFn.test(variableInfo.type.name)
      : regexpOrFn(variableInfo.type.name);
  });

  return possibleKind
    ? typeof possibleKind.itemKind === "function"
      ? possibleKind.itemKind(variableInfo)
      : possibleKind.itemKind
    : CompletionItemKind.Text;
}

exports.onCompletion = onCompletion;
