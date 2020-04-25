const { extname } = require("path");
const {
  promises: { readFile },
} = require("fs");
const babylon = require("@babel/parser");
const {
  default: createTypeGraph,
} = require("@hegel/core/type-graph/type-graph");
const { getConfig } = require("@hegel/cli/lib/config");
const { importModule } = require("@hegel/cli/lib/module");

const { babelrc, dtsrc } = require("../parser_settings");
const { wrapJSON } = require("../utils/wrap");
const { mixTypeDefinitions } = require("./type_definitions");

/**
 * Config for Hegel to file analysis. Here will be content from .hegelrc, if exists,
 * or default config.
 */
let config;

async function getHegelTypings(source, path) {
  try {
    const ast = babylon.parse(source, babelrc);
    const [[types], errors] = await createTypeGraph(
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

exports.getHegelTypings = getHegelTypings;
