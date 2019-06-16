import cosmic from "cosmiconfig";

const BABELRC = {
  sourceType: "module",
  plugins: ["flow", "bigInt"]
};

const workingDirectory = process.cwd();
const babelExplorer = cosmic("babel");
const hegelExplorer = cosmic("hegel");

export type Config = {
  include: ?Array<string>,
  exclude: ?Array<string>,
  workingDirectory: string,
  babel: Object
};

export async function getConfig(moduleName: string): Promise<Config> {
  const [hegelConfig, babelConfig] = await Promise.all([
    hegelExplorer.search(),
    null,
    // babelExplorer.search()
  ]);
  if (hegelConfig === null) {
    throw new Error(
      `There is no .${MODULE_NAME} config file in current project.`
    );
  }
  const babel = babelConfig === null ? BABELRC : babelConfig.config;
  return Object.assign(hegelConfig.config, { workingDirectory, babel });
}
