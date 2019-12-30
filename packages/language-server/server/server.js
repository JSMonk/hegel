const fs = require("fs");
const path = require("path");
const utils = require("util");
const babylon = require("@babel/parser");
const HegelError = require("@hegel/core/utils/errors").default;
const createTypeGraph = require("@hegel/core/type-graph/type-graph").default;
const { TYPE_SCOPE } = require("@hegel/core/type-graph/constants");
const { getVarAtPosition } = require("@hegel/core/utils/position-utils");
const {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  IPCMessageReader,
  IPCMessageWriter
} = require("vscode-languageserver");

const readFile = utils.promisify(fs.readFile);

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
    "@babel/plugin-proposal-optional-chaining",
  ]
};

const dtsrc = {
  sourceType: "module",
  strictMode: false,
  plugins: ["typescript"]
};

(async () => {
  const connection = createConnection(
    new IPCMessageReader(process),
    new IPCMessageWriter(process)
  );

  let ast = {},
    types = {},
    text = "",
    errors = [];

  const documents = new TextDocuments();

  documents.listen(connection);

  connection.listen();

  connection.onInitialize(() => {
    return {
      capabilities: {
        textDocumentSync: documents.syncKind,
        hoverProvider: true
      }
    };
  });

  connection.onHover(meta => {
    const location = convertRangeToLoc(meta.position);
    const varInfo = getVarAtPosition(location, types);
    if (!varInfo) {
      return;
    }
    const { type } = varInfo;
    const value =
      type.constraint !== undefined
        ? `${type.name}: ${type.constraint.name}`
        : type.name;
    return {
      contents: [{ language: "typescript", value }]
    };
  });

  documents.onDidChangeContent(change => {
    validateTextDocument(change.document);
  });

  const stdLibContent = await readFile(
    path.join(__dirname, "../node_modules/@hegel/typings/standard/index.d.ts"),
    { encoding: "utf8" }
  );
  const stdLibAST = babylon.parse(stdLibContent, dtsrc).program;
  const [[stdLibTypeGraph], sas] = await createTypeGraph(
    [stdLibAST],
    () => {},
    true
  );

  throw sas;
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

  function convertLocToRange(loc) {
    return {
      line: loc.line - 1,
      character: loc.column
    };
  }

  function convertRangeToLoc(loc) {
    return {
      line: loc.line + 1,
      column: loc.character
    };
  }

  function getModuleAST(currentModulePath) {
    return async importModulePath => {
      const importPath =
        importModulePath[0] === "."
          ? path.join(
              currentModulePath.slice(0, currentModulePath.lastIndexOf("/")),
              `${importModulePath}.js`
            )
          : "";
      const moduleContent = await readFile(importPath, { encoding: "utf8" });
      return Object.assign(babylon.parse(moduleContent, babelrc).program, {
        path: currentModulePath
      });
    };
  }

  async function validateTextDocument(textDocument) {
    text = textDocument.getText();
    try {
      ast = babylon.parse(text, babelrc);
      [[types], errors] = await createTypeGraph(
        [Object.assign(ast.program, { path: textDocument.uri })],
        getModuleAST(textDocument.uri.replace("file://", "")),
        false,
        mixTypeDefinitions
      );
    } catch (e) {
      errors = [e];
    }
    const diagnostics = [];
    for (let i = 0; i < errors.length; i++) {
      const error = errors[i];
      if (!(error instanceof HegelError) && !(error instanceof SyntaxError)) {
        continue;
      }
      const diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start:
            error instanceof HegelError
              ? convertLocToRange(error.loc.start)
              : { ...error.loc, line: error.loc.line - 1 },
          end:
            error instanceof HegelError
              ? convertLocToRange(error.loc.end)
              : { ...error.loc, column: 1000 }
        },
        message: error.message,
        source: "ex"
      };
      diagnostics.push(diagnostic);
    }
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }

  function getQuickInfo(file, position) {
    try {
      return this.tspClient.request("quickinfo", {
        file,
        line: position.line + 1,
        offset: position.character + 1
      });
    } catch (err) {
      return undefined;
    }
  }
})();
