#!/usr/local/bin/node
import meow from "meow";
import { getLogger } from "./lib/logger";
import { getSources } from "./lib/file-system"; 
import { importModule } from "./lib/module";
import { createGlobalScope } from "@hegel/core";
import { createASTGenerator } from "./lib/parser";
import { mixTypeDefinitions } from "./lib/typings";
import { getConfig, createConfig } from "./lib/config";
import { getErrorsPrint, getVerdictPrint } from "./lib/printer";
import type { ErrorWithLocation } from "./lib/printer";
import type { ExtendedProgram, HegelError } from "@hegel/core";

const logger = getLogger();
 
const CLI = meow(
  `
Usage
 $ hegel [COMMAND]

Valid values for COMMAND:
 init        Initializes a directory to be used as a Hegel root directory	  
 version     Print version number and exit
`,
  {
    input: ["init"]
  }
);

const COMMAND = CLI.input[0];

switch (COMMAND) {
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
    let errors: Array<ErrorWithLocation> = [];
    try {
      const asts: Array<ExtendedProgram> = await Promise.all(
        sources.map(file => getFileAST(file))
      );
      const result = await createGlobalScope(
        asts,
        importModule(config, getFileAST, true),
        false,
        await mixTypeDefinitions(config, getFileAST)
      );
      errors = result[1];
    } catch (e) {
      if (!(e instanceof SyntaxError)) {
        throw e;
      }
      errors = [e];
    }
    const result = await getErrorsPrint(errors);
    const verdict = getVerdictPrint(errors);
    logger.log(`${result}${verdict}`);
    process.exit(errors.length);
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
    }
    process.exit(1);
  }
}
