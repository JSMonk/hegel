// @flow
import HegelError from "@hegel/core/utils/errors";
import { existsSync } from "fs";
import { join, extname, dirname, isAbsolute } from "path";
import type { AST } from "./parser";
import type { Config } from "./config";
import type { ModuleScope } from "@hegel/core/type-graph/module-scope";
import type { Program, SourceLocation } from "@babel/parser";

const CWD = process.cwd();
const typings = dirname(require.resolve("@hegel/typings"));

const isRelative = (path: string) => path[0] === ".";
const isNotNull = (a: mixed) => a !== null;

async function resolveModule(importPath: string) {
  try {
    // $FlowIssue
    return require.resolve(importPath, { paths: [CWD] });
  } catch {}
  return null;
}

async function findTypingsInsideNodeModules(
  importPath: string,
  config: Config
): Promise<string | null> {
  let path = await resolveModule(importPath);
  if (path === null) {
    return null;
  }
  if (isAbsolute(path)) {
    const typingPath = `${path.slice(0, -extname(path).length)}.d.ts`;
    return existsSync(typingPath) ? typingPath : path;
  }
  if (config.libs.includes("nodejs")) {
    return join(typings, "nodejs", `${path}.d.ts`);
  }
  return null;
}

async function findInsideTypingsDirectories(
  importPath: string,
  config: Config
): Promise<string | null> {
  const paths = await Promise.all(
    config.typings.map(typingPath =>
      resolveModule(join(typingPath, importPath))
    )
  );
  return paths.find(isNotNull) || null;
}

async function getModuleTypingsPath(
  importPath: string,
  currentPath: string,
  loc: SourceLocation,
  config: Config
): Promise<[string, boolean]> {
  let resolvedPath: string | null = null;
  let isLibrary: boolean = false;
  let isUserDefined: boolean = false;
  if (isRelative(importPath)) {
    resolvedPath = await resolveModule(join(currentPath, importPath));
    isUserDefined = true;
  } else {
    isLibrary = true;
    resolvedPath = await findTypingsInsideNodeModules(importPath, config);
    if (resolvedPath === null) {
      resolvedPath = await findInsideTypingsDirectories(importPath, config);
      isUserDefined =
        resolvedPath !== null && resolvedPath.includes("node_modules");
    }
  }
  if (resolvedPath === null) {
    throw new HegelError(`Path "${importPath}" cannot be resolved`, loc);
  }
  const isTypings = extname(path) === ".ts";
  return { resolvedPath, isTypings, isLibrary, isUserDefined };
}

export function importModule(
  config: Config,
  getAST: (string, ?boolean) => Promise<AST>,
  cacheEveryModule: boolean = false
) {
  const cache: Map<string, ModuleScope> = new Map();
  return async (
    path: string,
    currentPath: string,
    loc: SourceLocation,
    getModuleScope: (Program, boolean) => Promise<ModuleScope>
  ) => {
    const {
      resolvedPath,
      isTypings,
      isLibrary,
      isUserDefined
    } = await getModuleTypingsPath(path, currentPath, loc, config);
    const existed = cache.get(resolvedPath);
    if (existed !== undefined) {
      return existed;
    }
    const ast = await getAST(resolvedPath, isTypings);
    const astWithPath = Object.assign(ast, { path: resolvedPath });
    const moduleScope = await getModuleScope(astWithPath, isTypings);
    if (cacheEveryModule || (isLibrary && !isUserDefined)) {
      cache.set(resolvedPath, moduleScope);
    }
    return moduleScope;
  };
}
