import chalk from "chalk";
import { join } from "path";
import { parse } from "@babel/parser";
import { readFileSync } from "fs";
import { codeFrameColumns } from "@babel/code-frame";
import createTypeGraph from "@hegel/core/type-graph/type-graph";
import printError from "./printer";

const babelrc = {
  sourceType: 'module',
  plugins: ['flow', 'bigInt'],
};

(async () => {
  const path = join(__dirname, "../src/test.js");
  const fileContent = readFileSync(path, "utf8");
  const ast = parse(fileContent, babelrc);
  const [modules, errors] = await createTypeGraph([{ ...ast.program, path }], () => {});
  let result = ""; 
  for (const error of errors) {
    result = `${result}\n\n${printError(error, fileContent)}`;
  }
  console.log(result);
  process.exit(errors.length);
})()
