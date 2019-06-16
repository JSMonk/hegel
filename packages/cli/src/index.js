// @flow
import { getConfig } from "./lib/config";
import { getLogger } from "./lib/logger";
import { createASTGenerator } from "./lib/parser";
import { getSources, importModule } from "./lib/file-system";
import { getErrorsPrint, getVerdictPrint } from "./lib/printer";
import createTypeGraph from "@hegel/core/type-graph/type-graph";

(async () => {
  const logger = getLogger();
  const config = await getConfig();
  const getFileAST = createASTGenerator(config);
  const sources = await getSources(config);
  const asts = await Promise.all(sources.map(file => getFileAST(file.path)));
  const [modules, errors] = await createTypeGraph(asts, importModule);
  const result = await getErrorsPrint(errors, getFileAST);
  const verdict = getVerdictPrint(errors);
  logger.log(result);
  logger.log(`\n${verdict}\n`);
  process.exit(errors.length);
})();
