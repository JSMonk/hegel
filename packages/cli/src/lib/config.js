// @flow
import cosmic from "cosmiconfig";

const BABELRC = {
  sourceType: "module",
  plugins: ["flow", "bigInt"]
};

const DEFAULT_EXTENSION = ".js";

const workingDirectory = process.cwd();
const babelExplorer = cosmic("babel");
const hegelExplorer = cosmic("hegel");

export type Config = {
  include: ?Array<string>,
  exclude: ?Array<string>,
  extension: string,
  workingDirectory: string,
  typings: ?string,
  babel: Object
};

export async function getConfig(): Promise<Config> {
  const [hegelConfig, babelConfig] = await Promise.all([
    hegelExplorer.search(),
    null
  ]);
  if (hegelConfig === null) {
    throw new Error(`There is no .hegelrc config file in current project.`);
  }
  const babel = babelConfig === null ? BABELRC : babelConfig.config;
  return Object.assign(hegelConfig.config, {
    workingDirectory,
    babel,
    extension: hegelConfig.config.extension || DEFAULT_EXTENSION
  });
}
