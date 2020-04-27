const { getConfig } = require("@hegel/cli/lib/config");
const { importModule } = require("@hegel/cli/lib/module");
const { getBabylonAST } = require("../utils/document-ast");
const { createGlobalScope } = require("@hegel/core");
const { mixTypeDefinitions } = require("./type-definitions");

/**
 * Config for Hegel to file analysis. Here will be content from .hegelrc, if exists,
 * or default config.
 */
let config;

async function getHegelTypings(source, path) {
  try {
    const ast = await getBabylonAST(path, source);
    const [[types], errors] = await createGlobalScope(
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

async function getModuleAST(currentModulePath) {
  if (!config) {
    config = await getConfig(currentModulePath);
  }
  return importModule(
    config,
    (modulePath, isTypings) => getBabylonAST(modulePath, null, isTypings),
    true
  );
}

/** Used in hover feature for describing type of node. */
function getTypeName(type) {
  return type.constraint !== undefined
    ? `${type.name}: ${type.constraint.name}`
    : String(type.name);
}

exports.getHegelTypings = getHegelTypings;
exports.getTypeName = getTypeName;
