const path = require("path");
const utils = require("util");
const babylon = require("@babel/parser");
const HegelError = require("@hegel/core/utils/errors").default;
const { getConfig } = require("@hegel/cli/lib/config");
const { importModule } = require("@hegel/cli/lib/module");
const {
  PositionedModuleScope
} = require("@hegel/core/type-graph/module-scope");
const {
  default: createTypeGraph,
  createModuleScope
} = require("@hegel/core/type-graph/type-graph");
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
  browserGlobalTypeGraph,
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
    "classPrivateMethods",
    "classPrivateProperties",
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
    return varInfo === undefined
      ? undefined
      : {
          contents: [
            { language: "typescript", value: getTypeName(varInfo.type || varInfo) }
          ]
        };
  }
});

let timeout;
documents.onDidChangeContent(change => {
  clearTimeout(timeout);
  timeout = setTimeout(() => validateTextDocument(change.document), 200);
});
connection.onDidChangeWatchedFiles(change =>
  validateTextDocument(change.document)
);

async function validateTextDocument(textDocument) {
  const text = textDocument.getText();
  const path = textDocument.uri.replace("file://", "");
  [types, errors, ast] = await getHegelTypings(text, path);
  const diagnostics = [];
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (!error || !("loc" in error) || error.source !== path) {
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
  try {
    const ast = babylon.parse(source, babelrc);
    const [[types], errors] = await createTypeGraph(
      [Object.assign(ast, { path })],
      await getModuleAST(path),
      false,
      mixTypeDefinitions(config),
      true
    );
    return [types, errors];
  } catch (e) {
    e.source = e.source || path;
     return [, [e]];
  }
}

async function getTypeGraphFor(path, globalScope) {
  const content = await readFile(path, "utf8");
  const errors = [];
  const graph = await createModuleScope(
    babylon.parse(content, dtsrc),
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
  nodeJsGlobalTypeGraph = await getTypeGraphFor(
    path.join(__dirname, "../node_modules/@hegel/typings/nodejs/globals.d.ts"),
    globalScope
  );
  return nodeJsGlobalTypeGraph;
}

async function getBrowserTypeDefinitions(globalScope) {
  browserGlobalTypeGraph = await getTypeGraphFor(
    path.join(__dirname, "../node_modules/@hegel/typings/browser/index.d.ts"),
    globalScope
  );
  return browserGlobalTypeGraph;
}

async function getModuleAST(currentModulePath) {
  if (!config) {
    config = await getConfig(currentModulePath);
  }
  return importModule(config, async (modulePath, isTypings) => {
    let moduleContent = await readFile(modulePath, "utf8");
    moduleContent =
      path.extname(modulePath) === ".json"
        ? wrapJSON(moduleContent)
        : moduleContent;
    const config = isTypings ? dtsrc : babelrc;
    return babylon.parse(moduleContent, config);
  }, true);
}

function wrapJSON(content) {
  return `export default ${content}`;
}

function mixTypeDefinitions(config) {
  return async globalScope => {
    if (stdLibTypeGraph === undefined) {
      stdLibTypeGraph = await getStandardTypeDefinitions(globalScope);
    }
    mixSomeTypeDefinitions(globalScope, stdLibTypeGraph);
    const shouldIncludeNodeJS = config.environment.includes("nodejs");
    const shouldIncludeBrowser = config.environment.includes("browser");
    const waitingTypes = [
      shouldIncludeNodeJS && nodeJsGlobalTypeGraph === undefined
        ? getNodeJSTypeDefinitions(globalScope)
        : nodeJsGlobalTypeGraph,
      shouldIncludeBrowser && browserGlobalTypeGraph === undefined
        ? getBrowserTypeDefinitions(globalScope)
        : browserGlobalTypeGraph
    ];
    const [nodeJsGlobalScope, browserGlobalScope] = await Promise.all(
      waitingTypes
    );
    if (shouldIncludeNodeJS) {
      mixSomeTypeDefinitions(globalScope, nodeJsGlobalScope);
    }
    if (shouldIncludeBrowser) {
      mixSomeTypeDefinitions(globalScope, browserGlobalScope);
    }
  };
}

function mixSomeTypeDefinitions(globalScope, additionalTypeGraph) {
  for (const [name, variable] of additionalTypeGraph.body.entries()) {
    variable.parent = globalScope;
    globalScope.body.set(name, variable);
  }
  for (const [name, type] of additionalTypeGraph.typeScope.body.entries()) {
    type.parent = globalScope.typeScope;
    globalScope.typeScope.body.set(name, type);
  }
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
    : String(type.name);
}
