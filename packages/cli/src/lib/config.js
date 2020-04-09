import cosmic from "cosmiconfig";
import { writeFileSync, existsSync } from "fs";
import { join, dirname, isAbsolute } from "path";
import type { ParserOptions } from "@babel/parser";

const BABELRC: ParserOptions = { 
  sourceType: "module",
  plugins: [
    "bigInt",
    "classProperties",
    "classPrivateMethods",
    "classPrivateProperties",
    ["flow", { all: true }]
  ]
};

const CWD = process.cwd();
const babelExplorer = cosmic("babel");
const hegelExplorer = cosmic("hegel");

const CONFIG_NAME = ".hegelrc";

const DEFAULT_CONFIG = {
  config: {
    include: ["./**/*.js"],
    exclude: ["./node_modules/**"],
    workingDirectory: CWD,
    babel: BABELRC,
    typings: ["./@types", "./node_modules/@types"]
  },
  filepath: join(CWD, CONFIG_NAME)
};

const DEFAULT_CONFIG_CONTENT = `include:
  - ./**/*.js
exclude:
  - ./node_modules/**
types:
  - ./@types
  - ./node_modules/@types`;

export type Environment = "browser" | "nodejs";

export type Config = {
  include: ?Array<string>,
  exclude: ?Array<string>,
  workingDirectory: string,
  environment: ?Environment,
  typings: Array<string>,
  babel: ParserOptions
};

export async function getConfig(workingDirectory = CWD) {
  const hegelConfig =
    (await getMainConfigs(workingDirectory)) || DEFAULT_CONFIG;
  const hegel = Object.assign(DEFAULT_CONFIG.config, hegelConfig.config);
  const projectRoot = dirname(hegelConfig.filepath);
  const typings = hegel.typings.map(
    path => (isAbsolute(path) ? path : join(projectRoot, path))
  );
  return Object.assign(hegel, { babel: BABELRC, typings });
}

export function createConfig(workingDirectory = CWD) {
  return writeFileSync(
    join(workingDirectory, CONFIG_NAME),
    DEFAULT_CONFIG_CONTENT
  );
}

function getMainConfigs(workingDirectory) {
  return hegelExplorer.search<Config>(workingDirectory);
}
