const babylon = require("@babel/parser");
const { extname } = require("path");
const { getConfig } = require("@hegel/cli/lib/config");
const { wrapJSON } = require("../utils/wrap");
const { importModule } = require("@hegel/cli/lib/module");
const { createGlobalScope } = require("@hegel/core");
const { mixTypeDefinitions } = require("./type_definitions");
const {
  promises: { readFile },
} = require("fs");
const { babelrc, dtsrc } = require("../parser_settings");

/**
 * Config for Hegel to file analysis. Here will be content from .hegelrc, if exists,
 * or default config.
 */
let config;

async function getHegelTypings(source, path) {
  try {
    const ast = babylon.parse(source, babelrc);
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
    async (modulePath, isTypings) => {
      let moduleContent = await readFile(modulePath, "utf8");
      moduleContent =
        extname(modulePath) === ".json"
          ? wrapJSON(moduleContent)
          : moduleContent;
      const config = isTypings ? dtsrc : babelrc;
      return babylon.parse(moduleContent, config);
    },
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
