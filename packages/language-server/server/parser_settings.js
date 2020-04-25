const dtsrc = {
  sourceType: "module",
  strictMode: false,
  plugins: ["typescript"]
};
const babelrc = {
  sourceType: "module",
  plugins: [
    ["flow", { all: true }],
    "bigInt",
    "classProperties",   
    "classPrivateMethods",
    "classPrivateProperties",
    "@babel/plugin-syntax-bigint",
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-private-methods",
    "@babel/plugin-proposal-numeric-separator",
    "@babel/plugin-syntax-dynamic-import",
    "@babel/plugin-proposal-nullish-coalescing-operator",
    "@babel/plugin-proposal-optional-catch-binding",
    "@babel/plugin-proposal-optional-chaining"
  ]
};

exports.dtsrc = dtsrc;
exports.babelrc = babelrc;