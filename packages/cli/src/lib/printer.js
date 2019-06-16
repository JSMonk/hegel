import chalk from "chalk";
import { codeFrameColumns } from "@babel/code-frame";
import type { AST } from "./parser";
import type { HegelError } from "@hegel/core/utils/errors";

export function printSingleError(error: HegelError, fileContent: string) {
  const line = chalk.dim.underline(`${error.source}:${error.loc.start.line}`); 
  const codeFrame = codeFrameColumns(fileContent, error.loc, {
    highlightCode: true,
    message: error.message
  });
  return `${line}\n${codeFrame}`;
}

export async function getErrorsPrint(
  errors: Array<HegelError>,
  getFileAST: string => Promise<AST>
) {
  let result = "";
  for (const error of errors) {
    const { content } = await getFileAST(error.source);
    result = `${result}\n\n${printSingleError(error, content)}`;
  }
  return result;
}

export function getVerdictPrint(errors) {
  let verdict = "";
  if (errors.length > 0) {
    verdict = `Found ${errors.length} error${errors.length > 1 ? "s" : ""}`;
  } else {
    verdict = "No errors!";
  }
  return verdict;
}
