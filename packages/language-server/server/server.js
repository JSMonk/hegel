const path = require("path");
const utils = require("util");
const babylon = require("@babel/parser");
const HegelError = require("@hegel/core/utils/errors").default;
const { getConfig } = require("@hegel/cli/lib/config");
const { importModule } = require("@hegel/cli/lib/module");
const { PositionedModuleScope } = require("@hegel/core/type-graph/module-scope");
const { default: createTypeGraph, createModuleScope }  = require("@hegel/core/type-graph/type-graph");
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
  nodeJsGlobalTypeGraph,
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
    ["flow", { all: true }],
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
  if (types instanceof PositionedModuleScope) {
    const varInfo = types.getVarAtPosition(location, types);
    return varInfo === undefined || varInfo.type === undefined
      ? undefined
      : {
          contents: [{ language: "typescript", value: getTypeName(varInfo.type) }]
        };
  }
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
  try {
    const ast = babylon.parse(source, babelrc);
    const [[types], errors] = await createTypeGraph(
      [Object.assign(ast.program, { path })],
      await getModuleAST(path),
      false,
      mixTypeDefinitions(config),
      true
    );
    return [types, errors];
  } catch (e) {
    return [, [e]];
  } 
}

async function getTypeGraphFor(path, globalScope) {
  const content = await readFile(path, "utf8");
  const errors = [];
  const graph = await createModuleScope(
    babylon.parse(content, dtsrc).program,
    errors,
    () => {},
    globalScope,
    true
  );
  if (errors.length > 0) {
    throw errors;
  } 
  return graph;
}

async function getStandardTypeDefinitions(globalScope) {
  stdLibTypeGraph = await getTypeGraphFor(
    path.join(__dirname, "../node_modules/@hegel/typings/standard/index.d.ts"),
    globalScope
  );
  return stdLibTypeGraph;
}

async function getNodeJSTypeDefinitions(globalScope) {
  nodeJsGlobalTypeGraph =  await getTypeGraphFor(
    path.join(__dirname, "../node_modules/@hegel/typings/nodejs/globals.d.ts"),
    globalScope
  );
  return nodeJsGlobalTypeGraph;
}

async function getModuleAST(currentModulePath) {
  if (!config) {
    config = await getConfig(currentModulePath);
  }
  return importModule(config, async (path, isTypings) => {
    const moduleContent = await readFile(path, "utf8");
    const config = isTypings ? dtsrc : babelrc;
    return babylon.parse(moduleContent, config).program;
  });
}

function mixTypeDefinitions(config) {
  return async globalScope => {
    if (stdLibTypeGraph === undefined) {
        stdLibTypeGraph = await getStandardTypeDefinitions(globalScope);
    }
    const body = new Map([...globalScope.body]);
    for (const [name, variable] of stdLibTypeGraph.body.entries()) {
      variable.parent = globalScope;
      body.set(name, variable);
    }
    const typesBody = new Map([
      ...globalScope.typeScope.body,
    ]);
    for (const [name, type] of stdLibTypeGraph.typeScope.body.entries()) {
      type.parent = globalScope.typeScope;
      typesBody.set(name, type);
    }
    globalScope.body = body;
    globalScope.typeScope.body = typesBody;
    if (!config.libs.includes("nodejs")) {
      return;
    }
    if (nodeJsGlobalTypeGraph === undefined) {
      nodeJsGlobalTypeGraph = await getNodeJSTypeDefinitions(globalScope);
    }
    for (const [name, variable] of nodeJsGlobalTypeGraph.body.entries()) {
      variable.parent = globalScope;
      body.set(name, variable);
    }
    for (const [name, type] of nodeJsGlobalTypeGraph.typeScope.body.entries()) {
      type.parent = globalScope.typeScope;
      typesBody.set(name, type);
    }
    globalScope.body = body;
    globalScope.typeScope.body = typesBody;
  };
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
