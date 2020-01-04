const path = require("path");
const utils = require("util");
const babylon = require("@babel/parser");
const HegelError = require("@hegel/core/utils/errors").default;
const createTypeGraph = require("@hegel/core/type-graph/type-graph").default;
const { getConfig } = require("@hegel/cli/lib/config");
const { TYPE_SCOPE } = require("@hegel/core/type-graph/constants");
const { importModule } = require("@hegel/cli/lib/module");
const { getVarAtPosition } = require("@hegel/core/utils/position-utils");
const {
  promises: { readFile }
} = require("fs");
const {
  TextDocuments,
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
  DiagnosticSeverity
} = require("vscode-languageserver");

let types = {},
  errors = [],
  stdLibTypeGraph,
  config;
const documents = new TextDocuments();
const connection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);
const dtsrc = {
  sourceType: "module",
  strictMode: false,
  plugins: ["typescript"]
};
const babelrc = {
  sourceType: "module",
  plugins: [
    "flow",
    "bigInt",
    "classProperties",
    "@babel/plugin-syntax-bigint",
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-private-methods",
    "@babel/plugin-proposal-numeric-separator",
    "@babel/plugin-syntax-dynamic-import",
    "@babel/plugin-proposal-nullish-coalescing-operator",
    "@babel/plugin-proposal-optional-catch-binding",
    "@babel/plugin-proposal-optional-chaining"
  ]
};

connection.listen();
documents.listen(connection);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: documents.syncKind,
    hoverProvider: true
  }
}));
connection.onHover(meta => {
  const location = convertRangeToLoc(meta.position);
  const varInfo = getVarAtPosition(location, types);
  return varInfo === undefined || varInfo.type === undefined
    ? undefined
    : {
        contents: [{ language: "typescript", value: getTypeName(varInfo.type) }]
      };
});
documents.onDidChangeContent(change => validateTextDocument(change.document));

async function validateTextDocument(textDocument) {
  const text = textDocument.getText();
  [types, errors] = await getHegelTypings(text, textDocument.uri);
  const diagnostics = [];
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (!error || !("loc" in error)) {
      continue;
    }
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: formatErrorRange(error),
      message: error.message,
      source: "ex"
    });
  }
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

async function getHegelTypings(source, path) {
  path = path.replace("file://", "");
  if (!stdLibTypeGraph) {
    stdLibTypeGraph = await getStandardTypeDefinitions();
  }
  try {
    const ast = babylon.parse(source, babelrc);
    const [[types], errors] = await createTypeGraph(
      [Object.assign(ast.program, { path })],
      await getModuleAST(path),
      false,
      mixTypeDefinitions
    );
    return [types, errors];
  } catch (e) {
    return [, [e]];
  }
}

async function getStandardTypeDefinitions() {
  const stdLibContent = await readFile(
    path.join(__dirname, "../node_modules/@hegel/typings/standard/index.d.ts"),
    "utf8"
  );
  const [[stdLibTypeGraph], errors] = await createTypeGraph(
    [babylon.parse(stdLibContent, dtsrc).program],
    () => {},
    true
  );
  if (errors.length > 0) {
    throw errors;
  }
  return stdLibTypeGraph;
}

async function getModuleAST(currentModulePath) {
  if (!config) {
    config = await getConfig(currentModulePath);
  }
  return importModule(config, async (path, isTypings) => {
    const stdLibContent = await readFile(path, "utf8");
    const config = isTypings ? dtsrc : babelrc;
    return babylon.parse(stdLibContent, config).program;
  });
}

function mixTypeDefinitions(scope) {
  const body = new Map([...stdLibTypeGraph.body, ...scope.body]);
  const typeScope = scope.body.get(TYPE_SCOPE);
  const typesBody = new Map([
    ...stdLibTypeGraph.body.get(TYPE_SCOPE).body,
    ...typeScope.body
  ]);
  scope.body = body;
  typeScope.body = typesBody;
}

function formatErrorRange(error) {
  const isSyntaxError = error instanceof SyntaxError;
  return {
    start: isSyntaxError
      ? { ...error.loc, line: error.loc.line - 1 }
      : convertLocToRange(error.loc.start),
    end: isSyntaxError
      ? { ...error.loc, column: 1000 }
      : convertLocToRange(error.loc.end)
  };
}

function convertRangeToLoc(loc) {
  return {
    line: loc.line + 1,
    column: loc.character
  };
}

function convertLocToRange(loc) {
  return {
    line: loc.line - 1,
    character: loc.column
  };
}

function getTypeName(type) {
  return type.constraint !== undefined
    ? `${type.name}: ${type.constraint.name}`
    : type.name;
}
