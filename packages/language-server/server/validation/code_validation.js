const { getHegelTypings } = require("./typings");
const { formatErrorRange } = require("../utils/range");
const { DiagnosticSeverity } = require("vscode-languageserver");

/** Holds Hegel typings of currently opened file. */
let types = {};
let errors = [];

async function validateTextDocument(textDocument) {
  const text = textDocument.getText();
  const path = decodeURIComponent(textDocument.uri).replace("file://", "");

  [types, errors] = await getHegelTypings(text, path);
  const diagnostics = [];
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (!error || !("loc" in error) || error.source !== path) {
      continue;
    }
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: formatErrorRange(error),
      message: error.message,
      source: "ex",
    });
  }
  return { uri: textDocument.uri, diagnostics };
}

function getPositionedModuleScopeTypes() {
  return types;
}

exports.validateTextDocument = validateTextDocument;
exports.getPositionedModuleScopeTypes = getPositionedModuleScopeTypes;
