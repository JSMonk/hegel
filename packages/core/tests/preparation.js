const fs = require("fs");
const path = require("path");
const babylon = require("@babel/parser");
const { createModuleScope } = require("../build/type-graph/type-graph");

const babelrc = {
  sourceType: "module",
  plugins: ["flow", "bigInt", "classProperties"]
};

const definitionsRc = {
  sourceType: "module",
  plugins: ["typescript"]
};

const libsFile = fs.readFileSync(
  path.join(__dirname, "../../typings/standard/index.d.ts"),
  "utf-8"
);

exports.prepareAST = (source, isTypeDefinitions) =>
  babylon.parse(source, isTypeDefinitions ? definitionsRc : babelrc).program;

exports.mixTypeDefinitions = () => {
  const definitionsAST = exports.prepareAST(libsFile, true);
  return async globalScope => {
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
