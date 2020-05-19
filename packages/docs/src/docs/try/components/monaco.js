import * as LZString from "lz-string";
import DARK_THEME from "./dark-theme.js";
import LIGHT_THEME from "./light-theme.js";
import HegelWorker from "workerize-loader!./hegel";
import { LanguageFeatureRegistry } from "monaco-editor/esm/vs/editor/common/modes/languageFeatureRegistry.js";

const PLAYGROUND = "Playground";
const STORAGE_KEY = "playgroundLastSource";

let hegel = typeof window === "object" ? new HegelWorker() : undefined;

export async function buildAndMountEditor(setEditor, currentTheme, id) {
  const monaco = await import("monaco-editor");
  setEditor(monaco.editor);
  const content = restoreContent();
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true
  });
  monaco.languages.registerHoverProvider("javascript", { provideHover });
  monaco.languages.registerCompletionItemProvider("javascript", {
    triggerCharacters: ["."],
    provideCompletionItems: async (model, position, context, token) =>
      getCompletionItems(monaco, model, position, context, token)
  });
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

async function provideHover(_, position) {
  if (hegel === undefined) {
    hegel = new HegelWorker();
  }
  const type = await hegel.getTypeByLocation({
    line: position.lineNumber,
    column: position.column
  });
  return type && { contents: [{ value: js(getTypeTooltip(type)) }] };
}

/**
 * Completes values.
 * @param {import('monaco-editor')} monaco 
 * @param {import('monaco-editor').editor.ITextModel} model 
 * @param {import('monaco-editor').Position} position 
 * @param {import('monaco-editor').languages.CompletionContext} context 
 * @param {import('monaco-editor').CancellationToken} token 
 * @returns {Promise<import('monaco-editor').languages.ProviderResult<import('monaco-editor').languages.CompletionList>>}
 */
async function getCompletionItems(monaco, model, position, context, token) {
  if (hegel === undefined) {
    hegel = new HegelWorker();
  }

  const word = model.getWordUntilPosition(context.triggerKind === 0
    ? position
    : {
      ...position,
      column: position.column - 1,
    });

  return {
    suggestions: await hegel.summonCompletionItems(
      monaco.languages.CompletionItemKind,
      word.word,
      context.triggerKind
    )
  };
}

let timeout = undefined;

function createLogicHandler(monaco, model) {
  if (hegel === undefined) {
    hegel = new HegelWorker();
  }
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const value = model.getValue();
      saveContent(value);
      const errors = await hegel.getDiagnostics(value);
      monaco.editor.setModelMarkers(
        model,
        PLAYGROUND,
        errors
          .filter(error => "loc" in error && error.loc !== undefined)
          .map(({ loc, message }) => formatDiagnostic(loc, message))
      );
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
