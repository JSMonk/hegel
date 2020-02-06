import chalk from "chalk";
import { getFileContent } from "./parser";
import { codeFrameColumns } from "@babel/code-frame";
import type { HegelError } from "@hegel/core";
import type { ExtendedSyntaxError } from "@babel/parser";

export type ErrorWithLocation = HegelError | ExtendedSyntaxError;

export function printSingleError(
  error: ErrorWithLocation,
  fileContent: string
) {
  const loc =
    "start" in error.loc
      ? error.loc
      : {
          start: error.loc,
          end: Object.assign(error.loc, { column: error.loc.column + 1 })
        };
  const line = chalk.dim.underline(`${error.source}:${String(loc.start.line)}`);
  const codeFrame = codeFrameColumns(fileContent, loc, {
    highlightCode: true,
    message: error.message.replace(/\([\d:]+\)/gi, "")
  });
  return `${line}\n${codeFrame}`;
}

export async function getErrorsPrint(errors: Array<ErrorWithLocation>) {
  let result = "";
  for (const error of errors) {
    if (error.source === "") {
      continue;
    }
    const content = await getFileContent(error.source);
    result = `${result}${printSingleError(error, content)}\n\n`;
  }
  return result;
}

export function getVerdictPrint(errors) {
  return errors.length > 0
    ? `Found ${String(errors.length)} error${errors.length > 1 ? "s" : ""}`
    : "No errors!";
}
