import chalk from "chalk";
import { codeFrameColumns } from "@babel/code-frame";
import type { HegelError } from "@hegel/core/utils/errors";

export default function printError(error: HegelError, fileContent: string) {
  const line = chalk.dim.underline(`${error.source}:${error.loc.start.line}`); 
  const codeFrame = codeFrameColumns(fileContent, error.loc, {
    highlightCode: true,
    message: error.message
  });
  return `${line}\n${codeFrame}`;
}
