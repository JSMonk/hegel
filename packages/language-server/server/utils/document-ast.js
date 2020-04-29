const babylon = require("@babel/parser");
const { extname } = require("path");
const { wrapJSON } = require("./wrap");
const { babelrc, dtsrc } = require("../parser-settings");
const {
  promises: { readFile },
} = require("fs");

/**
 * If [source] is provided - file will not be readed from "fs".
 */
exports.getBabylonAST = async function getBabylonAST(
  modulePath,
  source,
  isTypings = false
) {
  modulePath = decodeURIComponent(modulePath).replace("file://", "");

  let moduleContent =
    source !== null && source !== undefined
      ? source
      : await readFile(modulePath, "utf8");
  moduleContent =
    extname(modulePath) === ".json" ? wrapJSON(moduleContent) : moduleContent;

  const config = isTypings ? dtsrc : babelrc;
  return babylon.parse(moduleContent, config);
};
