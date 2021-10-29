const { onHover } = require("./hover/hover");
const { onCompletion } = require("./completion/completion");
const { TextDocument } = require("vscode-languageserver-textdocument");
const { onCompletionResolve } = require("./completion/completion-resolve");
const { validateTextDocument } = require("./validation/code-validation");
const {
  TextDocuments,
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
  TextDocumentSyncKind,
} = require("vscode-languageserver");

const documents = new TextDocuments(TextDocument);
const connection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
    hoverProvider: true,
    completionProvider: {
      resolveProvider: true,
      triggerCharacters: ["."],
    },
  },
}));

/** Is used for preventing every time re-analyzation at every keyboard button pressing. */
let timeoutId;
function onDidChange(change) {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(async () => {
    const diagnostics = await validateTextDocument(change.document);
    connection.sendDiagnostics(diagnostics);
  }, 100);
}

connection.onHover(onHover);
connection.onCompletion(onCompletion);
connection.onCompletionResolve(onCompletionResolve);
connection.onDidChangeWatchedFiles(onDidChange);
documents.onDidChangeContent(onDidChange);

documents.listen(connection);
connection.listen();
