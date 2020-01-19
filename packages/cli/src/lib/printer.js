import chalk from "chalk";  
import { codeFrameColumns } from "@babel/code-frame";
import type { AST } from "./parser";

type LineLocation = { line: number, column: number };
type HegelSourceLocation = { start: LineLocation, end: LineLocation  }
type SourceLocation = LineLocation | HegelSourceLocation; 
type ErrorWithLocation =  { ...Error, loc: SourceLocation, source: string }; 

export function printSingleError(error: ErrorWithLocation, fileContent: string) { 
 const loc = "start" in error.loc ? error.loc : {
   start: error.loc,
   end: Object.assign(error.loc, { column: error.loc.column + 1 })
 };
 const line = chalk.dim.underline(`${error.source}:${loc.start.line}`);
 const codeFrame = codeFrameColumns(fileContent, loc, {
   highlightCode: true,
   message: error.message.replace(/\([\d:]+\)/gi, "")
 });
 return `${line}\n${codeFrame}`;
}

export async function getErrorsPrint( 
 errors: Array<ErrorWithLocation>,
 getFileAST: string => Promise<AST>
) {
 let result = "";
 for (const error of errors) {
   const ast = await getFileAST(error.source);
   result = `${result}\n\n${printSingleError(error, content)}`;
 }
 return result;
}
 
export function getVerdictPrint(errors: Array<unknown>) {
 return errors.length > 0 ? `Found ${errors.length} error${errors.length > 1 ? "s" : ""}` : "No errors!";
}