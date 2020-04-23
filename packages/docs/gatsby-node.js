const fs = require("fs");
const path = require("path");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const { NODE_ENV } = process.env;

const REPOSITORY = "https://github.com/JSMonk/hegel";
const STD_LIB_PATH = "@hegel/typings/standard/index.d.ts";
const STD_LIB_CONTENT = fs
  .readFileSync(require.resolve(STD_LIB_PATH), "utf8")
  .replace(/`/g, "");

const LOCAL_CORE_BUILD = path.resolve(__dirname, '../../core/build/')

const resolve = NODE_ENV !== 'production' && fs.existsSync(LOCAL_CORE_BUILD)?  {
  alias: {
    '@hegel/core': LOCAL_CORE_BUILD,
  },
} : {};

exports.onCreateWebpackConfig = args => {
  args.actions.setWebpackConfig({
    plugins: [
      args.plugins.define({
        STD_LIB_CONTENT: "`" + STD_LIB_CONTENT + "`",
        REPOSITORY: "'" + REPOSITORY + "'"
      }),
      new MonacoWebpackPlugin({
        languages: ["javascript", "css", "html", "typescript", "json"]
      })
    ],
    resolve
  });
};
