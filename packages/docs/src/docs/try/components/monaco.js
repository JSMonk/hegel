import * as LZString from "lz-string";
import DARK_THEME from "./dark-theme.js";
import LIGHT_THEME from "./light-theme.js";
import { LanguageFeatureRegistry } from "monaco-editor/esm/vs/editor/common/modes/languageFeatureRegistry.js";
import { getDiagnostics, getTypeByLocation } from "./hegel";

const PLAYGROUND = "Playground";
const STORAGE_KEY = "playgroundLastSource";

export async function buildAndMountEditor(setEditor, currentTheme, id) {
  const monaco = await import("monaco-editor");
  setEditor(monaco.editor);
  const content = restoreContent();
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true
  });
  monaco.languages.registerHoverProvider("javascript", { provideHover });
  monaco.editor.defineTheme("dark", DARK_THEME);
  monaco.editor.defineTheme("light", LIGHT_THEME);
  const editorContainer = document.getElementById(id);
  const editor = monaco.editor.create(editorContainer, {
    value: content,
    theme: currentTheme,
    language: "javascript",
    minimap: { enabled: false }
  });
  const model = editor.getModel();
  const handler = createLogicHandler(monaco, model);
  model.onDidChangeContent(handler);
  handler();
}

function restoreContent() {
  const hash = window.location.hash || localStorage.getItem(STORAGE_KEY) || "";
  if (hash[0] !== "#" || hash.length < 2) return "";
  const encoded = hash.slice(1);
  if (encoded.match(/^[a-zA-Z0-9+/=_-]+$/)) {
    return LZString.decompressFromEncodedURIComponent(encoded);
  }
  return "";
}

function saveContent(content) {
  setTimeout(() => {
    const encoded = LZString.compressToEncodedURIComponent(content);
    window.history.replaceState(undefined, undefined, `#${encoded}`);
    localStorage.setItem(STORAGE_KEY, window.location.hash);
  }, 0);
}

function provideHover(_, position) {
  const type = getTypeByLocation({
    line: position.lineNumber,
    column: position.column
  });
  return type && { contents: [{ value: js(getTypeTooltip(type)) }] };
}

let timeout = undefined;

function createLogicHandler(monaco, model) {
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const value = model.getValue();
      saveContent(value);
      try {
        const errors = await getDiagnostics(value);
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
    }, 300);
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
