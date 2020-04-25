const { getTypeName } = require("./validation/typings");
const { TextDocument } = require("vscode-languageserver-textdocument");
const { convertRangeToLoc } = require("./utils/range");
const { PositionedModuleScope } = require("@hegel/core");
const { validateTextDocument, types } = require("./validation/code_validation");
const {
  TextDocuments,
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
} = require("vscode-languageserver");

const documents = new TextDocuments(TextDocument);
const connection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: documents.syncKind,
    hoverProvider: true,
  },
}));

connection.onHover((meta) => {
  const location = convertRangeToLoc(meta.position);
  if (types instanceof PositionedModuleScope) {
    const varInfoOrType = types.getVarAtPosition(location);

    return varInfoOrType === undefined
      ? undefined
      : {
          contents: [
            {
              language: "typescript",
              value: getTypeName(varInfoOrType.type || varInfoOrType),
            },
          ],
        };
  }
});

/** Is used for preventing every time re-analyzation at every keyboard button pressing. */
let timeoutId;
function onDidChange(change) {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(async () => {
    const diagnostics = await validateTextDocument(change.document);
    connection.sendDiagnostics(diagnostics);
  }, 200);
}

documents.onDidChangeContent(onDidChange);

connection.onDidChangeWatchedFiles(onDidChange);

documents.listen(connection);
connection.listen();
