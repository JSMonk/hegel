const babylon = require("@babel/parser");

const babelrc = {
  sourceType: "module",
  plugins: ["flow"]
};

module.exports = source => babylon.parse(source, babelrc).program;
