// @flow
import createTypeGraph from "@hegel/core/type-graph/type-graph";
// $FlowIssue
import { repository } from "../package.json";
import { dirname, join } from "path";
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
  const [[globalScope]] = await createTypeGraph(
    [definitionsAST],
    () => {},
    true
  );
  return (scope: Scope) => {
    const body = new Map([...globalScope.body, ...scope.body]);
    const globalTypeScope = globalScope.body.get("[[TypeScope]]");
    const localTypeScope = scope.body.get("[[TypeScope]]");
    if (globalTypeScope === undefined || localTypeScope === undefined) {
      throw new Error(
        `@hegel/core is broken. Please, sent issue at ${repository}!`
      );
    }
    const typesBody = new Map([
      ...globalTypeScope.body,
      ...localTypeScope.body
    ]);
    scope.body = body;
    localTypeScope.body = typesBody;
  };
}
