const {
  PositionedModuleScope,
} = require("@hegel/core/type-graph/module-scope");
const {
  TextDocuments,
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
} = require("vscode-languageserver");
const { TextDocument } = require("vscode-languageserver-textdocument");

const { validateTextDocument, types } = require("./validation/code_validation");
const { convertRangeToLoc } = require("./utils/range");

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
  let varInfo; // TODO: this variable was never defined.
  const location = convertRangeToLoc(meta.position);
  if (types instanceof PositionedModuleScope) {
  const varInfoOrType = types.getVarAtPosition(location);
  if (varInfoOrType  === undefined) {
    return;
  }
    return varInfo === undefined
      ? undefined
      : {
          contents: [
            {
              language: "typescript",
              value: getTypeName(varInfo.type || varInfo),
            },
          ],
        };
  }
});

documents.onDidChangeContent(async (change) => {
  const diagnostics = await validateTextDocument(change.document);
  connection.sendDiagnostics(diagnostics);
});

connection.onDidChangeWatchedFiles(async (change) => {
  const diagnostics = await validateTextDocument(change.document);
  connection.sendDiagnostics(diagnostics);
});

documents.listen(connection);
connection.listen();

function getTypeName(type) {
  return type.constraint !== undefined
    ? `${type.name}: ${type.constraint.name}`
    : String(type.name);
}
