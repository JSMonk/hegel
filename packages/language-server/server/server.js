const fs = require('fs');
const path = require('path');
const utils = require('util');
const babylon = require('@babel/parser');
const createTypeGraph = require('@hegel/core/type-graph/type-graph').default;
const { POSITIONS } = require('@hegel/core/type-graph/constants');
const { getVarAtPosition } = require('@hegel/core/utils/position-utils');
const {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  IPCMessageReader,
  IPCMessageWriter,
} = require('vscode-languageserver');

const readFile = utils.promisify(fs.readFile);

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

function getModuleAST(currentModulePath) {
  return async importModulePath => {
    const importPath =
      importModulePath[0] === '.'
        ? path.join(
            currentModulePath.slice(0, currentModulePath.lastIndexOf('/')),
            `${importModulePath}.js`
          )
        : '';
    const moduleContent = await readFile(importPath, { encoding: 'utf8' });
    return babylon.parse(moduleContent, babelrc).program;
  };
}

async function validateTextDocument(textDocument) {
  text = textDocument.getText();
  ast = babylon.parse(text, babelrc);
  [[types], errors] = await createTypeGraph(
    [ast.program],
    getModuleAST(textDocument.uri.replace('file://', ''))
  );
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
