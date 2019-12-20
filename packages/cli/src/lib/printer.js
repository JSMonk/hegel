// @flow
import chalk from "chalk";
import { codeFrameColumns } from "@babel/code-frame";
import type { AST } from "./parser";
import type { HegelError } from "@hegel/core/utils/errors";

type ExtendedSyntaxError = SyntaxError & { loc: any, source: string };

export function printSingleError(
  error: HegelError | ExtendedSyntaxError,
  fileContent: string
) {
  const loc = error.loc.start
    ? error.loc
    : { start: error.loc, end: { ...error.loc, column: error.loc.column + 1 } };
  const line = chalk.dim.underline(`${error.source}:${loc.start.line}`);
  const codeFrame = codeFrameColumns(fileContent, loc, {
    highlightCode: true,
    message: error.message.replace(/\([\d:]+\)/gi, "")
  });
  return `${line}\n${codeFrame}`;
}

export async function getErrorsPrint(
  errors: Array<HegelError | ExtendedSyntaxError>,
  getFileAST: string => Promise<AST>
) {
  let result = "";
  for (const error of errors) {
    const { content } = await getFileAST(error.source);
    result = `${result}\n\n${printSingleError(error, content)}`;
  }
  return result;
}

export function getVerdictPrint(
  errors: Array<HegelError | ExtendedSyntaxError>
) {
  let verdict = "";
  if (errors.length > 0) {
    verdict = `Found ${errors.length} error${errors.length > 1 ? "s" : ""}`;
  } else {
    verdict = "No errors!";
  }
  return verdict;
}
