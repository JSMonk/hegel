#!/usr/local/bin/node
// @flow
import createTypeGraph from "@hegel/core/type-graph/type-graph";
import { getConfig } from "./lib/config";
import { getLogger } from "./lib/logger";
import { getSources } from "./lib/file-system";
import { importModule } from "./lib/module";
import { createASTGenerator } from "./lib/parser";
import { mixTypeDefinitions } from "./lib/typings";
import { getErrorsPrint, getVerdictPrint } from "./lib/printer";

(async () => {
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
        importModule(config, getFileAST, true),
        false,
        await mixTypeDefinitions(getFileAST)
      );
    } catch (e) {
      errors = [e];
    }
    const result = await getErrorsPrint(errors, getFileAST);
    const verdict = getVerdictPrint(errors);
    logger.log(`${result}${result !== "" ? "\n\n" : ""}${verdict}`);
    process.exit(errors.length);
  } catch (e) {
    logger.error(e.message);
  }
})();
