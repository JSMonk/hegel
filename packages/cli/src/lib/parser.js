//import { parse } from "@babel/parser";
//import { promises as fs } from "fs";
//import type { Config } from "./config";
//import type { SourceLocation } from "@babel/parser";
//
export type AST = {
  content: string,
  path: string
};
//
//export function createASTGenerator(config: Config) {
//  const cache = new Map();
//  return async (path: string, isDefinition: ?boolean = false): Promise<AST> => {
//    const cached = cache.get(path);
//    if (cached !== undefined) {
//      return cached;
//    }
//    try {
//      const content = await fs.readFile(path, "utf8");
//      let result = { path, content };
//      cache.set(path, result);
//      const ast = parse(content, {
//        strictMode: !isDefinition,
//        ...config.babel,
//        plugins: isDefinition
//          ? [
//              "typescript",
//              ...config.babel.plugins.filter(plugin => plugin !== "flow")
//            ]
//          : config.babel.plugins
//      });
//      Object.assign(result, ast.program);
//      return result;
//    } catch (e) {
//      e.source = e.source || path;
//      throw e;
//    }
//  };
//}