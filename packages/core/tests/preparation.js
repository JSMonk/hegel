const babylon = require("@babel/parser");
const fs = require("fs");
const path = require("path");

const babelrc = {
  sourceType: "module",
  plugins: ["flow", "classProperties"]
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

exports.mixTypeDefinitions = async createModuleScope => {
  const definitionsAST = exports.prepareAST(libsFile, true);
  const [[globalScope]] = await createModuleScope(
    [definitionsAST],
    () => {},
    true
  );
  return scope => {
    const body = new Map([...globalScope.body, ...scope.body]);
    const typesBody = new Map([
      ...globalScope.body.get("[[TypeScope]]").body,
      ...scope.body.get("[[TypeScope]]").body
    ]);
    scope.body = body;
    scope.body.get("[[TypeScope]]").body = typesBody;
  };
};

exports.getModuleAST = () => {};
