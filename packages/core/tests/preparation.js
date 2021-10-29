import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import { createModuleScope } from "../src/type-graph/type-graph";

const babelrc = {
  sourceType: "module",
  plugins: [["flow", { all: true }], "bigInt", "classProperties"],
};

const definitionsRc = {
  sourceType: "module",
  plugins: ["typescript"],
  strictMode: false,
};

const libsFile = fs.readFileSync(
  path.join(require.resolve("@hegel/typings"), "..", "standard/index.d.ts"),
  "utf-8"
);

export const prepareAST = (source, isTypeDefinitions) =>
  parse(source, isTypeDefinitions ? definitionsRc : babelrc);

export const mixTypeDefinitions = () => {
  const definitionsAST = prepareAST(libsFile, true);
  return async (globalScope) => {
    const errors = [];
    const typingsScope = await createModuleScope(
      definitionsAST,
      errors,
      () => {},
      globalScope,
      true
    );
    if (errors.length !== 0) {
      throw errors;
    }
    for (const [name, variable] of typingsScope.body.entries()) {
      variable.parent = globalScope;
      globalScope.body.set(name, variable);
    }
    for (const [name, type] of typingsScope.typeScope.body.entries()) {
      type.parent = globalScope.typeScope;
      globalScope.typeScope.body.set(name, type);
    }
  };
};
