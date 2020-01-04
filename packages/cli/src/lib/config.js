// @flow
import cosmic from "cosmiconfig";
import { join, dirname } from "path";
import { writeFileSync, existsSync } from "fs";

const BABELRC = {
  sourceType: "module",
  plugins: ["flow", "bigInt"]
};

const CWD = process.cwd();
const babelExplorer = cosmic("babel");
const hegelExplorer = cosmic("hegel");

const CONFIG_NAME = ".hegelrc";
const PROJECT_ROOT = "[PROJECT_ROOT]";

const DEFAULT_CONFIG = {
  config: {
    include: ["./**/*.js"],
    exclude: null,
    typings: null,
    extension: ".js",
    workingDirectory: CWD,
    babel: BABELRC,
    typings: [`${PROJECT_ROOT}/node_modules/@types`],
    libs: []
  }
};

const DEFAULT_CONFIG_CONTENT = `
include:
  - ./**/*.js
`;

export type Lib = "browser" | "nodejs";

export type Config = {
  include: ?Array<string>,
  exclude: ?Array<string>,
  extension: string,
  workingDirectory: string,
  typings: ?string,
  babel: Object,
  libs: Array<Lib>,
  typings: Array<string>
};

export type CosmicConfig = {
  config: Config,
  filepath: string
};

export async function getConfig(
  workingDirectory?: string = CWD
): Promise<Config> {
  // $FlowIssue
  let [hegelConfig, babelConfig] = await getMainConfigs(workingDirectory);
  if (hegelConfig === null) {
    await init(workingDirectory);
    [hegelConfig, babelConfig] = [DEFAULT_CONFIG, null];
  }
  const babel = babelConfig === null ? BABELRC : babelConfig.config;
  const hegel = Object.assign({}, DEFAULT_CONFIG.config, hegelConfig.config);
  return Object.assign(hegel, {
    babel,
    typings: hegel.typings.map(path => {
      path = path.replace(
        PROJECT_ROOT,
        hegelConfig.filepath ? dirname(hegelConfig.filepath) : workingDirectory
      );
      //      if (!existsSync(path)) {
      //        throw new Error(`Config Error: "${path}" in your typings are not exists`);
      //      }
      return path;
    })
  });
}

function init(workingDirectory: string) {
  return writeFileSync(
    join(workingDirectory, CONFIG_NAME),
    DEFAULT_CONFIG_CONTENT
  );
}

function getMainConfigs(
  workingDirectory: string
): Promise<Array<CosmicConfig | null>> {
  return Promise.all([hegelExplorer.search(workingDirectory), null]);
}
