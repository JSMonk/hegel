const { getHegelTypings } = require("./typings");
const { formatErrorRange } = require("../utils/range");
const { DiagnosticSeverity } = require("vscode-languageserver");

/** Holds Hegel typings of currently opened file. */
let moduleTypes = {};

async function validateTextDocument(textDocument) {
  const text = textDocument.getText();
  const path = decodeURIComponent(textDocument.uri).replace("file://", "");

  const [types, errors] = await getHegelTypings(text, path);

  /**
   * This is used for preventing assigning to moduleTypes "undefined" if file contains errors.
   * In this case moduleTypes will always contains valid types before any errors occur.
   * Type completion will work.
   */
  if (types !== undefined) {
    moduleTypes = types;
  }

  const diagnostics = errors
    .filter((error) => "loc" in error && error.source === path)
    .map((error) => ({
      severity: DiagnosticSeverity.Error,
      range: formatErrorRange(error),
      message: error.message,
      source: "ex",
    }));

  return { uri: textDocument.uri, diagnostics };
}

function getPositionedModuleScopeTypes() {
  return moduleTypes;
}

exports.validateTextDocument = validateTextDocument;
exports.getPositionedModuleScopeTypes = getPositionedModuleScopeTypes;
