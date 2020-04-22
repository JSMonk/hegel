import { parse } from "@babel/parser";
import { createModuleScope, createGlobalScope } from "@hegel/core";

let module = undefined;

const STANDARD_LIB_OPTIONS = { plugins: ["typescript"] };
const DEFAULT_OPTIONS = {
  plugins: [
    "bigInt",
    "classProperties",
    "numericSeparator",
    "classPrivateMethods",
    "classPrivateProperties",
    ["flow", { all: true }]
  ]
};
// eslint-disable-next-line
const STANDARD_AST = parse(STD_LIB_CONTENT, STANDARD_LIB_OPTIONS);

export function getTypeByLocation(location) {
  if (module === undefined) {
    return;
  }
  const varInfo = module.getVarAtPosition(location);
  return varInfo && (varInfo.type || varInfo);
}

let stdLibTypeGraph;

export async function mixTypeDefinitions(globalScope) {
  if (stdLibTypeGraph === undefined) {
    stdLibTypeGraph = await getStandardTypeDefinitions(globalScope);
  }
  const body = new Map(globalScope.body);
  for (const [name, variable] of stdLibTypeGraph.body.entries()) {
    variable.parent = globalScope;
    body.set(name, variable);
  }
  const typesBody = new Map(globalScope.typeScope.body);
  for (const [name, type] of stdLibTypeGraph.typeScope.body.entries()) {
    type.parent = globalScope.typeScope;
    typesBody.set(name, type);
  }
  globalScope.body = body;
  globalScope.typeScope.body = typesBody;
}

export async function getStandardTypeDefinitions(globalScope) {
  const errors = [];
  const graph = await createModuleScope(
    STANDARD_AST,
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

export async function getDiagnostics(sourceCode) {
  let errors = [];
  try {
    const file = parse(sourceCode, DEFAULT_OPTIONS);
    [[module], errors] = await createGlobalScope(
      [file],
      () => {},
      false,
      mixTypeDefinitions,
      true
    );
  } catch (e) {
    errors = [e];
  }
  return errors.map(toTransferableObject);
}

function toTransferableObject(error) {
  const loc = error.loc;
  return {
    message: error.message,
    source: error.source,
    loc: loc && formatLoc(loc)
  };
}

function formatLoc(loc) {
  return loc.start
    ? {
        start: { line: loc.start.line, column: loc.start.column },
        end: { line: loc.end.line, column: loc.end.column }
      }
    : {
        start: { line: loc.line, column: loc.column },
        end: { line: loc.line, column: loc.column + 1 }
      };
}
