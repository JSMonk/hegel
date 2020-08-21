import { parse } from "@babel/parser";
import { extname } from "path";
import { promises as fs } from "fs";
import type { Config } from "./config";
import type { ParserPlugin, Program, File } from "@babel/parser";

export type FileMeta = {
  content: string,
  path: string,
};

export type ExtendedFile = {
  ...File,
  ...FileMeta,
};

const cache = new Map<string, FileMeta | ExtendedFile>();

export async function getFileContent(path) {
  const cached = cache.get(path);
  if (cached !== undefined) {
    return cached.content;
  }
  let content = await fs.readFile(path, "utf8");
  content = extname(path) === ".json" ? wrapJSON(content) : content;
  let result = { path, content };
  void cache.set(path, result);
  return content;
}

export function createASTGenerator(config: Config) {
  return async (path, isDefinition = false) => {
    const cached = cache.get(path);
    if (cached !== undefined && "program" in cached) {
      return cached;
    }
    try {
      const content = await getFileContent(path);
      const declaredPlugins: Array<ParserPlugin> =
        config.babel.plugins !== undefined ? config.babel.plugins : [];
      const plugins = isDefinition
        ? declaredPlugins
            .filter((plugin) =>
              typeof plugin === "string"
                ? plugin !== "flow"
                : plugin[0] !== "flow"
            )
            .concat(["typescript"])
        : declaredPlugins;
      const ast = parse(
        content,
        Object.assign({}, config.babel, { strictMode: !isDefinition, plugins })
      );
      const result: ExtendedFile = Object.assign(ast, { path, content });
      void cache.set(path, result);
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
