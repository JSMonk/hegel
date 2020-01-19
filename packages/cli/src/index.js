#!/usr/local/bin/node
// @flow
import meow from "meow";
import createTypeGraph from "@hegel/core/type-graph/type-graph";
import { getLogger } from "./lib/logger";
import { getSources } from "./lib/file-system";
import { importModule } from "./lib/module";
import { createASTGenerator } from "./lib/parser";
import { mixTypeDefinitions } from "./lib/typings";
import { getConfig, createConfig } from "./lib/config";
import { getErrorsPrint, getVerdictPrint } from "./lib/printer";

const logger = getLogger();

const CLI = meow(`
Usage
  $ hegel [COMMAND]

Valid values for COMMAND:
  init        Initializes a directory to be used as a Hegel root directory	  
  version     Print version number and exit
`, {
  input: ["init"]
});

const COMMAND =CLI.input[0]; 

switch(COMMAND) {
  case "init":
    createConfig();
    logger.log("Project initialized.");
    break;
  case "version":
    CLI.showVersion();
    break;
  case undefined:
    main();
    break;
  default:
    logger.error(`Unsupported command "${COMMAND}"!`);
}

async function main() {
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
}
