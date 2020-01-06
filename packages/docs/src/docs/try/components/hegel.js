import createTypeGraph from "@hegel/core/type-graph/type-graph";
import { parse } from "@babel/parser";
import { getVarAtPosition } from "@hegel/core/utils/position-utils";

let globalScope = null;

const STANDARD_LIB_OPTIONS = { plugins: ["typescript"] };
const DEFAULT_OPTIONS = { plugins: ["flow"] };
// eslint-disable-next-line
const STANDARD_AST = parse(STD_LIB_CONTENT, STANDARD_LIB_OPTIONS).program;

export function getTypeByLocation(location) {
  if (globalScope === null) {
    return;
  }
  const varInfo = getVarAtPosition(location, globalScope);
  return varInfo && varInfo.type;
}

export function mixTypeDefinitions(globalScope) {
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

export function prepeareSTD() {
  return createTypeGraph([STANDARD_AST], () => {}, true);
}

export async function getDiagnostics(sourceCode, mixing) {
  const ast = parse(sourceCode, DEFAULT_OPTIONS).program;
  const [[scope], errors] = await createTypeGraph(
    [ast],
    () => {},
    false,
    mixing
  );
  globalScope = scope;
  return errors;
}
