#!/usr/local/bin/node
// @flow
import createTypeGraph from "@hegel/core/type-graph/type-graph";
import { getConfig } from "./lib/config";
import { getLogger } from "./lib/logger";
import { getSources } from "./lib/file-system";
import { getErrorsPrint, getVerdictPrint } from "./lib/printer";
import { createASTGenerator, importModule } from "./lib/parser";

(async () => {
  const logger = getLogger();
  try {
    const config = await getConfig();
    const getFileAST = createASTGenerator(config);
    const sources = await getSources(config);
    const asts = await Promise.all(
      sources.map(file => getFileAST(file.fullPath))
    );
    const [modules, errors] = await createTypeGraph(
      asts,
      importModule(config, getFileAST)
    );
    const result = await getErrorsPrint(errors, getFileAST);
    const verdict = getVerdictPrint(errors);
    logger.log(result);
    logger.log(`\n${verdict}\n`);
    process.exit(errors.length);
  } catch (e) {
    logger.error(e.message);
  }
})();
