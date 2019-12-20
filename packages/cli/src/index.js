#!/usr/local/bin/node
// @flow
import { join } from "path";
// $FlowIssue
import { repository } from "./package.json";
import { readFileSync } from "fs";
import createTypeGraph from "@hegel/core/type-graph/type-graph";
import { getConfig } from "./lib/config";
import { getLogger } from "./lib/logger";
import { getSources } from "./lib/file-system";
import { getErrorsPrint, getVerdictPrint } from "./lib/printer";
import { createASTGenerator, importModule } from "./lib/parser";

(async () => {
  const standard = require.resolve("@hegel/typings/standard/index.d.ts");
  const logger = getLogger();
  try {
    const config = await getConfig();
    const getFileAST = createASTGenerator(config);
    const sources = await getSources(config);
    let errors;
    try {
      const asts = await Promise.all(
        sources.map(file => getFileAST(file.fullPath))
      );
      [, errors] = await createTypeGraph(
        asts,
        importModule(config, getFileAST),
        false,
        await mixTypeDefinitions(standard, getFileAST)
      );
    } catch (e) {
      errors = [e];
    }
    const result = await getErrorsPrint(errors, getFileAST);
    const verdict = getVerdictPrint(errors);
    logger.log(result);
    logger.log(`\n${verdict}\n`);
    process.exit(errors.length);
  } catch (e) {
    logger.error(e.message);
  }
})();

async function mixTypeDefinitions(standard, prepeareAST) {
  const definitionsAST = await prepeareAST(standard, true);
  const [[globalScope]] = await createTypeGraph(
    [definitionsAST],
    () => {},
    true
  );
  return scope => {
    const body = new Map([...globalScope.body, ...scope.body]);
    const globalTypeScope = globalScope.body.get("[[TypeScope]]");
    const localTypeScope = scope.body.get("[[TypeScope]]");
    if (globalTypeScope === undefined || localTypeScope === undefined) {
      throw new Error(
        "@hegel/core is broken. Please, sent issue at ${repository}!"
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
