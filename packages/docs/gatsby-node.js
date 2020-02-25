const fs = require("fs");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const REPOSITORY = "https://github.com/JSMonk/hegel";
const STD_LIB_PATH = "@hegel/typings/standard/index.d.ts";
const STD_LIB_CONTENT = fs
  .readFileSync(require.resolve(STD_LIB_PATH), "utf8")
  .replace(/`/g, "");

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
    ]
  });
};
