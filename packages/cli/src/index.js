#!/usr/bin/env node
import meow from "meow";
import { getLogger } from "./logger";
import { getSources } from "./file-system";  
import { importModule } from "./module";
import { createGlobalScope } from "@hegel/core"; 
import { createASTGenerator } from "./parser";
import { mixTypeDefinitions } from "./typings";
import { getConfig, createConfig } from "./config";
import { getErrorsPrint, getVerdictPrint } from "./printer";
import type { ErrorWithLocation } from "./printer"; 
import type { ExtendedFile, HegelError } from "@hegel/core"; 

const logger = getLogger();

const helpMessage = `
Usage
 $ hegel [COMMAND]

Valid values for COMMAND:
 init        Initializes a directory to be used as a Hegel root directory	  
 version     Print version number and exit
`;

const CLI = meow(helpMessage,
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
      const asts: Array<ExtendedFile> = await Promise.all(
        sources.map(file => getFileAST(file))
      );
      const result = await createGlobalScope(
        asts,
        importModule(config, getFileAST, true),
        false,
        await mixTypeDefinitions(config, getFileAST)  
      );
      //console.log(result)
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
    void process.exit(errors.length);
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
    }
    void process.exit(1);
  }
}
