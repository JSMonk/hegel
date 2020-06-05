const { EMPTY_SCOPE } = require("../constants");
const { getHegelTypings } = require("./typings");
const { formatErrorRange } = require("../utils/range");
const { DiagnosticSeverity } = require("vscode-languageserver");

/**
 * Holds Hegel typings of currently opened file.
 * Server will validate content of file after first change, so [moduleTypes]
 * must be initialised with default properties. After successfull analyzing
 * they will be replaced with actual types.
 */
let moduleTypes = EMPTY_SCOPE;

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
      source: "Hegel",
    }));

  return { uri: textDocument.uri, diagnostics };
}

function getPositionedModuleScopeTypes() {
  return moduleTypes;
}

exports.validateTextDocument = validateTextDocument;
exports.getPositionedModuleScopeTypes = getPositionedModuleScopeTypes;
