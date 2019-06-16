import { parse } from "@babel/parser";
import { promises as fs } from "fs";
import type { Config } from "./config";

export type AST = {
  content: string,
  path: string
};

export function createASTGenerator(config: Config) {
  const cache = new Map();
  return async (path: string): AST => {
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
