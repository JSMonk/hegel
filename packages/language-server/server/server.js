const babylon = require('@babel/parser');
const {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  IPCMessageReader,
  IPCMessageWriter,
} = require('vscode-languageserver');
const createTypeGraph = require('hegel/build/type/type-graph').default;
const { POSITIONS } = require('hegel/build/type/types');
const { getVarAtPosition } = require('hegel/build/utils/utils');

const babelrc = {
  sourceType: 'module',
  plugins: ['flow'],
};

const connection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

let ast = {},
  types = {},
  text = '',
  errors = [];

const documents = new TextDocuments();

documents.listen(connection);

connection.listen();

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      hoverProvider: true,
    },
  };
});

function convertLocToRange(loc) {
  return {
    line: loc.line - 1,
    character: loc.column,
  };
}

function convertRangeToLoc(loc) {
  return {
    line: loc.line + 1,
    column: loc.character,
  };
}

connection.onHover(meta => {
  const location = convertRangeToLoc(meta.position);
  const varInfo = getVarAtPosition(location, types);
  if (!varInfo) {
    return;
  }
  return {
    contents: [{ language: 'typescript', value: varInfo.type.name }],
  };
});

documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

function validateTextDocument(textDocument) {
  text = textDocument.getText();
  ast = babylon.parse(text, babelrc);
  [types, errors] = createTypeGraph(ast.program);
  const diagnostics = [];
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    const diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: convertLocToRange(error.loc.start),
        end: convertLocToRange(error.loc.end),
      },
      message: error.message,
      source: 'ex',
    };
    diagnostics.push(diagnostic);
  }
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function getQuickInfo(file, position) {
  try {
    return this.tspClient.request('quickinfo', {
      file,
      line: position.line + 1,
      offset: position.character + 1,
    });
  } catch (err) {
    return undefined;
  }
}
