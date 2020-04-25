const path = require("path");
const babylon = require("@babel/parser");
const { dtsrc } = require("../parser_settings");
const {
  promises: { readFile },
} = require("fs");
const { createModuleScope } = require("@hegel/core");

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
    path.join(
      __dirname,
      "../../node_modules/@hegel/typings/standard/index.d.ts"
    ),
    globalScope
  );
  return stdLibTypeGraph;
}

async function getNodeJSTypeDefinitions(globalScope) {
  nodeJsGlobalTypeGraph = await getTypeGraphFor(
    path.join(
      __dirname,
      "../../node_modules/@hegel/typings/nodejs/globals.d.ts"
    ),
    globalScope
  );
  return nodeJsGlobalTypeGraph;
}

async function getBrowserTypeDefinitions(globalScope) {
  browserGlobalTypeGraph = await getTypeGraphFor(
    path.join(
      __dirname,
      "../../node_modules/@hegel/typings/browser/index.d.ts"
    ),
    globalScope
  );
  return browserGlobalTypeGraph;
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

exports.mixTypeDefinitions = mixTypeDefinitions;
