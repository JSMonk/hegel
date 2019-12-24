// @flow
import cosmic from "cosmiconfig";
import { join } from "path";
import { writeFileSync } from "fs";

const BABELRC = {
  sourceType: "module",
  plugins: ["flow", "bigInt"]
};

const DEFAULT_EXTENSION = ".js";

const workingDirectory = process.cwd();
const babelExplorer = cosmic("babel");
const hegelExplorer = cosmic("hegel");

const CONFIG_NAME = ".hegelrc";

const DEFAULT_CONFIG = {
  config: {
    include: ["./**/*.js"],
    exclude: null,
    typings: null,
    extension: "",
    workingDirectory,
    babel: BABELRC
  }
};

const DEFAULT_CONFIG_CONTENT = `
include:
  - ./**/*.js
`;

export type Config = {
  include: ?Array<string>,
  exclude: ?Array<string>,
  extension: string,
  workingDirectory: string,
  typings: ?string,
  babel: Object
};

function init() {
  return writeFileSync(
    join(workingDirectory, CONFIG_NAME),
    DEFAULT_CONFIG_CONTENT
  );
}

export async function getConfig(): Promise<Config> {
  let [hegelConfig, babelConfig] = await getMainConfigs();
  if (hegelConfig === null) {
    await init();
    [hegelConfig, babelConfig] = [DEFAULT_CONFIG, null];
  }
  const babel = babelConfig === null ? BABELRC : babelConfig.config;
  return Object.assign(hegelConfig.config, {
    workingDirectory,
    babel,
    extension: hegelConfig.config.extension || DEFAULT_EXTENSION
  });
}

function getMainConfigs() {
  return Promise.all([hegelExplorer.search(), null]);
}
