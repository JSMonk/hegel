import React from "react";
import createTypeGraph from "@hegel/core/type-graph/type-graph";
import { parse } from "@babel/parser";
import { useThemeUI } from "theme-ui";
import { getVarAtPosition } from "@hegel/core/utils/position-utils";
import { LanguageFeatureRegistry } from "monaco-editor/esm/vs/editor/common/modes/languageFeatureRegistry.js";
import DARK_THEME from "./dark-theme.js";
import LIGHT_THEME from "./light-theme.js";

// Disabling TypeScript Hints
LanguageFeatureRegistry.prototype.ordered = function(model) {
  const result = [];
  this._orderedForEach(model, entry => result.push(entry.provider));
  return result.slice(-1);
};

let globalScope = null;

const STANDARD_LIB_OPTIONS = { plugins: ["typescript"] };
const DEFAULT_OPTIONS = { plugins: ["flow"] };
// eslint-disable-next-line
const STANDARD_AST = parse(STD_LIB_CONTENT, STANDARD_LIB_OPTIONS).program;

export function CodePlayground(props) {
  const [editor, setEditor] = React.useState(null);
  const { colorMode } = useThemeUI();
  React.useEffect(() => {
    buildAndMountEditor(setEditor, colorMode);
  }, []);
  React.useEffect(
    () => {
      if (editor) {
        editor.setTheme(colorMode);
      }
    },
    [colorMode, editor]
  );
  return (
    <div id="editor-container" style={{ width: "100%", height: "100%" }} />
  );
}

async function buildAndMountEditor(setEditor, currentTheme) {
  const [monaco, [[stdLib]]] = await Promise.all([
    import("monaco-editor"),
    createTypeGraph([STANDARD_AST], () => {}, true)
  ]);
  setEditor(monaco.editor);
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    "useBuiltIn.TypeScriptExtension": false
  });
  monaco.languages.registerHoverProvider("javascript", { provideHover });
  monaco.editor.defineTheme("dark", DARK_THEME);
  monaco.editor.defineTheme("light", LIGHT_THEME);
  const editor = monaco.editor.create(
    document.getElementById("editor-container"),
    {
      value: "const hey = 'Hello, Hegel!';",
      theme: currentTheme,
      language: "javascript",
      minimap: { enabled: false }
    }
  );
  const model = editor.getModel();
  const mixing = mixTypeDefinitions(stdLib);
  const handler = createLogicHandler(monaco, model, mixing);
  model.onDidChangeContent(handler);
  handler();
}

function mixTypeDefinitions(globalScope) {
  return scope => {
    const body = new Map([...globalScope.body, ...scope.body]);
    const globalTypeScope = globalScope.body.get("[[TypeScope]]");
    const localTypeScope = scope.body.get("[[TypeScope]]");
    if (globalTypeScope === undefined || localTypeScope === undefined) {
      throw new Error(
        "@hegel/core is broken. Please, sent issue at ${repository}!"
      );
    }
    const typesBody = new Map([
      ...globalTypeScope.body,
      ...localTypeScope.body
    ]);
    scope.body = body;
    localTypeScope.body = typesBody;
  };
}

function provideHover(_, position) {
  const location = { line: position.lineNumber, column: position.column };
  if (globalScope === null) {
    return;
  }
  const varInfo = getVarAtPosition(location, globalScope);
  if (!varInfo) {
    return;
  }
  const { type } = varInfo;
  const value =
    type.constraint !== undefined
      ? `${type.name}: ${type.constraint.name}`
      : type.name;
  return {
    contents: [
      {
        value: `\`\`\`js
${value}
\`\`\``
      }
    ]
  };
}

function createLogicHandler(monaco, model, mixing) {
  return async () => {
    const value = model.getValue();
    try {
      const ast = parse(value, DEFAULT_OPTIONS).program;
      const [[scope], errors] = await createTypeGraph(
        [ast],
        () => {},
        false,
        mixing
      );
      globalScope = scope;
      monaco.editor.setModelMarkers(
        model,
        "Playground",
        errors.map(({ loc = { start: {}, end: {} }, message }) => ({
          startLineNumber: loc.start.line,
          endLineNumber: loc.end.line,
          startColumn: loc.start.column + 1,
          endColumn: loc.end.column + 1,
          message
        }))
      );
    } catch (error) {
      if ("loc" in error) {
        const loc = error.loc.start
          ? error.loc
          : {
              start: error.loc,
              end: { ...error.loc, column: error.loc.column + 1 }
            };
        monaco.editor.setModelMarkers(model, "Playground", [
          {
            startLineNumber: loc.start.line,
            endLineNumber: loc.end.line,
            startColumn: loc.start.column + 1,
            endColumn: loc.end.column + 1,
            message: error.message.replace(/\(.+?\)/g, "")
          }
        ]);
        return;
      }
      throw error;
    }
  };
}
