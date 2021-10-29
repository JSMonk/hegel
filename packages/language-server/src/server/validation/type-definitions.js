const { ModuleScope } = require("@hegel/core");
const { getBabylonAST } = require("../utils/document-ast");
const { createModuleScope } = require("@hegel/core");

/**
 * Cash of global type graph.
 */
let globalScopeGraph = new ModuleScope();

function getGlobalScopeGraph() {
  return globalScopeGraph;
}

let stdLibTypeGraph;
let browserGlobalTypeGraph;
let nodeJsGlobalTypeGraph;

function mixTypeDefinitions(config) {
  return async (globalScope) => {
    if (stdLibTypeGraph === undefined) {
      stdLibTypeGraph = await getStandardTypeDefinitions(globalScope);
    }
    mixSomeTypeDefinitions(globalScope, stdLibTypeGraph);

    /**
     * By default platform specific types will not be used if this options
     * does not set in config file.
     */
    const shouldIncludeNodeJS = config.environment
      ? config.environment.includes("nodejs")
      : false;
    const shouldIncludeBrowser = config.environment
      ? config.environment.includes("browser")
      : false;

    const waitingTypes = [
      shouldIncludeNodeJS && nodeJsGlobalTypeGraph === undefined
        ? getNodeJSTypeDefinitions(globalScope)
        : nodeJsGlobalTypeGraph,
      shouldIncludeBrowser && browserGlobalTypeGraph === undefined
        ? getBrowserTypeDefinitions(globalScope)
        : browserGlobalTypeGraph,
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

    globalScopeGraph = globalScope;
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

async function getStandardTypeDefinitions(globalScope) {
  stdLibTypeGraph = await getTypeGraphFor(
    require.resolve("@hegel/typings/standard/index.d.ts"),
    globalScope
  );
  return stdLibTypeGraph;
}

async function getNodeJSTypeDefinitions(globalScope) {
  nodeJsGlobalTypeGraph = await getTypeGraphFor(
    require.resolve("@hegel/typings/nodejs/globals.d.ts"),
    globalScope
  );
  return nodeJsGlobalTypeGraph;
}

async function getBrowserTypeDefinitions(globalScope) {
  browserGlobalTypeGraph = await getTypeGraphFor(
    require.resolve("@hegel/typings/browser/index.d.ts"),
    globalScope
  );
  return browserGlobalTypeGraph;
}

async function getTypeGraphFor(path, globalScope) {
  const errors = [];
  const graph = await createModuleScope(
    await getBabylonAST(path, null, true),
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

exports.mixTypeDefinitions = mixTypeDefinitions;
exports.getGlobalScopeGraph = getGlobalScopeGraph;
