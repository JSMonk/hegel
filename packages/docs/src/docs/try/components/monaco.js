import DARK_THEME from "./dark-theme.js";
import LIGHT_THEME from "./light-theme.js";
import { LanguageFeatureRegistry } from "monaco-editor/esm/vs/editor/common/modes/languageFeatureRegistry.js";
import {
  prepeareSTD,
  getDiagnostics,
  getTypeByLocation,
  mixTypeDefinitions
} from "./hegel";

const PLAYGROUND = "Playground";

export async function buildAndMountEditor(setEditor, currentTheme, id) {
  const [monaco, [[stdLib]]] = await Promise.all([
    import("monaco-editor"),
    prepeareSTD()
  ]);
  setEditor(monaco.editor);
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true
  });
  monaco.languages.registerHoverProvider("javascript", { provideHover });
  monaco.editor.defineTheme("dark", DARK_THEME);
  monaco.editor.defineTheme("light", LIGHT_THEME);
  const editorContainer = document.getElementById(id);
  const editor = monaco.editor.create(editorContainer, {
    value: ``,
    theme: currentTheme,
    language: "javascript",
    minimap: { enabled: false }
  });
  const model = editor.getModel();
  const mixing = mixTypeDefinitions(stdLib);
  const handler = createLogicHandler(monaco, model, mixing);
  model.onDidChangeContent(handler);
  handler();
}

function provideHover(_, position) {
  const type = getTypeByLocation({
    line: position.lineNumber,
    column: position.column
  });
  return type && { contents: [{ value: js(getTypeTooltip(type)) }] };
}

function createLogicHandler(monaco, model, mixing) {
  return async () => {
    const value = model.getValue();
    try {
      const errors = await getDiagnostics(value, mixing);
      monaco.editor.setModelMarkers(
        model,
        PLAYGROUND,
        errors.map(({ loc, message }) => formatDiagnostic(loc, message))
      );
    } catch (error) {
      if ("loc" in error) {
        monaco.editor.setModelMarkers(model, PLAYGROUND, [
          formatDiagnostic(formatLoc(error.loc), formatMessage(error.message))
        ]);
        return;
      }
      throw error;
    }
  };
}

// Disabling TypeScript Hints
LanguageFeatureRegistry.prototype.ordered = function(model) {
  const result = [];
  this._orderedForEach(model, entry => result.push(entry.provider));
  return result.slice(-1);
};

function js(value) {
  return `\`\`\`js
${value}
\`\`\``;
}

function getTypeTooltip(type) {
  return type.constraint !== undefined
    ? `${type.name}: ${type.constraint.name}`
    : type.name;
}

function formatLoc(loc) {
  return loc.start
    ? loc
    : {
        start: loc,
        end: { ...loc, column: loc.column + 1 }
      };
}

function formatDiagnostic(loc = { start: {}, end: {} }, message) {
  return {
    startLineNumber: loc.start.line,
    endLineNumber: loc.end.line,
    startColumn: loc.start.column + 1,
    endColumn: loc.end.column + 1,
    message
  };
}

function formatMessage(message) {
  return message.replace(/\(.+?\)/g, "");
}
