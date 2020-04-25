const { onHover } = require("./hover/hover");
const { TextDocument } = require("vscode-languageserver-textdocument");
const { validateTextDocument } = require("./validation/code_validation");
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

connection.onHover(onHover);

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
