import { parse } from "@babel/parser";
import { extname } from "path";
import { promises as fs } from "fs";
import type { Config } from "./config";
import type { ParserPlugin, Program } from "@babel/parser";

export type File = {
  content: string,
  path: string
};

export type AST = {
  ...Program,
  ...File
};

const cache = new Map<string, number>();

export async function getFileContent(path) {
  const cached = cache.get(path);
  if (cached !== undefined) {
    return cached.content;
  }
  let content = await fs.readFile(path, "utf8");
  content = extname(path) === ".json" ? wrapJSON(content) : content;
  let result = { path, content };
  cache.set(path, result);
  return content;
}

export function createASTGenerator(config: Config) {
  return async (path, isDefinition = false) => {
    const cached = cache.get(path);
    if (cached !== undefined && "body" in cached) {
      return cached;
    }
    try {
      const content = await getFileContent(path);
      const declaredPlugins: Array<ParserPlugin> =
        config.babel.plugins !== undefined
          ? config.babel.plugins
          : [];
      const plugins = isDefinition
        ? declaredPlugins
            .filter(
              plugin =>
                typeof plugin === "string" 
                  ? plugin !== "flow"
                  : plugin[0] !== "flow"
            )
            .concat(["typescript"])
        : declaredPlugins;
      const configCopy = Object.assign({}, config.babel);
      const ast = parse(
        content,
        Object.assign(configCopy, { strictMode: !isDefinition, plugins })
      );
      const result = Object.assign(ast.program, { path, content });
      cache.set(path, result);
      return result;
    } catch (e) {
      if (e instanceof Error) {
        e.source = path;
      }
      throw e;
    }
  };
}

function wrapJSON(content) {
  return `export default ${content}`;
}
