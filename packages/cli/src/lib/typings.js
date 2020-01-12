// @flow
// $FlowIssue
import { repository } from "../package.json";
import { dirname, join } from "path";
import { createModuleScope } from "@hegel/core/type-graph/type-graph";
import type { AST } from "./parser";
import type { Scope } from "@hegel/core/type-graph/scope";

const standard = join(
  dirname(require.resolve("@hegel/typings")),
  "standard/index.d.ts"
);

export async function mixTypeDefinitions(
  prepeareAST: (string, boolean) => Promise<AST>
) {
  const definitionsAST = await prepeareAST(standard, true);
  return async (globalScope: Scope) => {
    const errors = [];
    const typingsScope = await createModuleScope(
      definitionsAST,
      errors,
      () => {},
      globalScope,
      true
    );
    if (typingsScope === undefined || errors.length !== 0) {
      throw new Error(
        `@hegel/core is broken. Please, sent issue at ${repository}!`
      );
    }
    const body = new Map([...typingsScope.body, ...globalScope.body]);
    const typesBody = new Map([
      ...typingsScope.typeScope.body,
      ...globalScope.typeScope.body
    ]);
    globalScope.body = body;
    globalScope.typeScope.body = typesBody;
  };
}
