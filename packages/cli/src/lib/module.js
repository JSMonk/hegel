import { HegelError } from "@hegel/core";
import { existsSync, promises } from "fs";
import { join, extname, dirname, isAbsolute, resolve } from "path";
import type { ExtendedProgram } from "@hegel/core";
import type { Config } from "./config";
import type { ModuleScope } from "@hegel/core";
import type { Program, SourceLocation } from "@babel/parser";

const typings = dirname(require.resolve("@hegel/typings")); 

const isRelative = (path: string) => path[0] === ".";
const isNotNull = (a: unknown) => a !== null;

async function resolveModule(importPath, config) { 
  if (existsSync(importPath)) {
    return importPath;
  } 
  try {
    return require.resolve(importPath, { paths: [config.workingDirectory] });
  } catch {}
  return null;
}

async function findTypingsInsideNodeModules(importPath, config: Config) { 
  let path = await resolveModule(importPath, config);
  if (path === null) {
    return null;
  }
  if (isAbsolute(path)) {
    const pathToPackage = await resolveModule(
      join(importPath, "package.json"),
      config
    );
    let typingsPath = `${path.slice(0, -extname(path).length)}.d.ts`;
    if (pathToPackage !== null) {
      const packageJSON = JSON.parse(
        await promises.readFile(pathToPackage, "utf8")
      );
      if (typeof packageJSON === "object" && packageJSON !== null && "types" in packageJSON && typeof packageJSON.types === "string") {
        typingsPath = join(dirname(pathToPackage), packageJSON.types);
      }
      typingsPath = typingsPath.includes("d.ts")
        ? typingsPath
        : `${typingsPath}.d.ts`;
    }
    return existsSync(typingsPath) ? typingsPath : path;
  }
  if (config.environment.includes("nodejs")) { 
    return join(typings, "nodejs", `${path}.d.ts`);
  }
  return null; 
}
 
async function findInsideTypingsDirectories(
  importPath: string,
  config: Config
) {
  const paths = await Promise.all(
    config.typings.map(typingPath =>
      resolveModule(
        join(typingPath, `${importPath.replace(/\.js$/, "")}.d.ts`),
        config
      )
    )
  );
  return paths.find(isNotNull) || null;
}

type ModuleAttributes = {
  isLibrary: boolean,
  isTypings: boolean,
  isUserDefined: boolean,
  resolvedPath: string
};

async function getModuleTypingsPath(
  importPath,
  currentPath, 
  loc,
  config
) {
  currentPath = resolve(currentPath);
  let resolvedPath: string | null = null;
  let isLibrary = false;
  let isUserDefined = false;
  if (isRelative(importPath)) {
    importPath = join(dirname(currentPath), importPath);
    resolvedPath = await resolveModule(importPath, config);
    isUserDefined = true;
  } else {
    isLibrary = true;
    resolvedPath = await findInsideTypingsDirectories(importPath, config);
    isUserDefined =
      resolvedPath !== null && resolvedPath.includes("node_modules");
    if (resolvedPath === null || extname(resolvedPath) !== ".ts") {
      resolvedPath =
        (await findTypingsInsideNodeModules(importPath, config)) ||
        resolvedPath;
    }
  }
  if (resolvedPath === null) {
    throw new HegelError(`Path "${importPath}" cannot be resolved`, loc);
  }
  const isTypings = extname(resolvedPath) === ".ts";
  return { resolvedPath, isTypings, isLibrary, isUserDefined };
}

async function parseAndAnalyze(
  module,
  getAST: (string, ?boolean) => Promise<ExtendedProgram>,
  getModuleScope: (ExtendedProgram, boolean) => Promise<ModuleScope>
) { 
  const ast = await getAST(module.resolvedPath, module.isTypings);
  ast.path = module.resolvedPath;
  return getModuleScope(ast, module.isTypings);
}

export function importModule(config, getAST, cacheEveryModule = false) {
  const cache = new Map<string, Promise<ModuleScope>>();
  return async (path, currentPath, loc, getModuleScope) => {
    const module = await getModuleTypingsPath(path, currentPath, loc, config);
    const existed = cache.get(module.resolvedPath); 
    if (existed !== undefined) {
      return existed;
    }
    const moduleScope = parseAndAnalyze(module, getAST, getModuleScope);
    if (cacheEveryModule || (module.isLibrary && !module.isUserDefined)) {
      cache.set(module.resolvedPath, moduleScope);
    }
    return moduleScope;
  };
}
