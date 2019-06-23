// @flow
import { parse } from "@babel/parser";
import { promises as fs } from "fs";
import { join, resolve, dirname } from "path";
import { getSources } from "./file-system";
import type { Config } from "./config";

export type AST = {
  content: string,
  path: string
};

const DEPENDENCIES_DIRECTORY = "node_modules";
const DEFAULT_IMPORT_FILE = "index";

export function createASTGenerator(config: Config) {
  const cache = new Map();
  return async (path: string): Promise<AST> => {
    const cached = cache.get(path);
    if (cached !== undefined) {
      return cached;
    }
    const content = await fs.readFile(path, "utf8");
    const ast = parse(content, config.babel);
    const result = Object.assign(ast.program, { path, content });
    cache.set(path, result);
    return result;
  };
}

async function normalizePath(
  config: Config,
  importPath: string,
  currentPath: string
) {
  const directory = importPath.startsWith(".")
    ? dirname(currentPath)
    : join(config.workingDirectory, DEPENDENCIES_DIRECTORY);
  let path = resolve(directory, importPath);
  const pathStat = await fs.stat(path);
  if (pathStat.isDirectory()) {
    path = join(path, DEFAULT_IMPORT_FILE);
  }
  path = path.endsWith(config.extension) ? path : `${path}${config.extension}`;
  return path;
}

export function importModule(config: Config, getAST: string => Promise<AST>) {
  return async (path: string, currentPath: string) => {
    path = await normalizePath(config, path, currentPath);
    const ast = await getAST(path);
    return Object.assign(ast, { path });
  };
}
