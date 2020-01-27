import manifest from "../package.json";
import { dirname, join } from "path";
import { createModuleScope } from "@hegel/core";
import type { Config } from "./config";
import type {
  HegelError,
  ModuleScope,
  VariableInfo,
  Type,
  ExtendedProgram
} from "@hegel/core";

const typings = dirname(require.resolve("@hegel/typings"));
const nodejs = join(typings, "nodejs/globals.d.ts");
const standard = join(typings, "standard/index.d.ts");

async function mixLibraryToGlobal(ast, globalScope: ModuleScope) {
  const errors = new Array<HegelError>(0);
  const typingsScope = await createModuleScope(
    ast,
    errors,
    () => {},
    globalScope,
    true
  );
  if (errors.length !== 0) {
    throw new Error(
      `@hegel/core is broken. Please, sent issue at ${manifest.repository.url}!`
    );
  }
  const body = new Map<string, VariableInfo>(globalScope.body);
  const typesBody = new Map<unknown, Type>(globalScope.typeScope.body);
  for (const entry of typingsScope.body.entries()) {
    const variable = entry[1];
    variable.parent = globalScope;
    body.set(entry[0], variable);
  }
  for (const entry of typingsScope.typeScope.body.entries()) {
    const type = entry[1];
    type.parent = globalScope.typeScope;
    typesBody.set(entry[0], type);
  }
  globalScope.body = body;
  globalScope.typeScope.body = typesBody;
}

export async function mixTypeDefinitions(
  config: Config,
  prepeareAST: (string, boolean) => Promise<ExtendedProgram>
) {
  const standardAST = await prepeareAST(standard, true);
  const nodejsAST = config.libs.includes("nodejs")
    ? await prepeareAST(nodejs, true)
    : undefined;
  return async globalScope => {
    await mixLibraryToGlobal(standardAST, globalScope);
    if (nodejsAST !== undefined) {
      await mixLibraryToGlobal(nodejsAST, globalScope);
    }
  };
}
