import * as path from "path";
import fs from "fs";
import merge from "webpack-merge";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";
import DefinePlugin from "webpack/lib/DefinePlugin";

const STD_LIB_PATH = "@hegel/typings/standard/index.d.ts";
const STD_LIB_CONTENT = fs
  .readFileSync(require.resolve(STD_LIB_PATH), "utf8")
  .replace(/`/g, "");

const PUBLIC = path.resolve(__dirname, "public");
const SRC = path.resolve(__dirname, "src");

const config = {
  plugins: [
    new DefinePlugin({ STD_LIB_CONTENT: "`" + STD_LIB_CONTENT + "`" }),
    new MonacoWebpackPlugin({
      languages: ["javascript", "css", "html", "typescript", "json"]
    })
  ]
};

export default {
  title: "Hegel",
  description: "Feel power of types",
  indexHtml: "public/index.html",
  theme: "src/theme/index",
  typescript: false,
  propsParser: false,
  mdPlugins: [],
  ignore: ["src/theme/**"],
  public: "./public",
  htmlContext: {
    // favicon: '/public/images/favicon.png',
  },
  menu: [
    {
      name: "Intro",
      menu: ["What and Why?"]
    },
    {
      name: "Setup",
      menu: ["Installation", "Editor Plugins"]
    },
    {
      name: "Type Annotations",
      menu: [
        "Primitive Types",
        "Literal Types",
        "Unknown Type",
        "Optional Types",
        "Variable Types",
        "Function Types",
        "Object Types",
        "Class Types",
        "Array Types",
        "Tuple Types",
        "Union Types",
        "Generic Types",
        "Utility Types"
      ]
    },
    {
      name: "Type System",
      menu: [
        "No Any",
        "Type Compatibility",
        "Type Inference",
        "Type Refinements",
        "Type Refinements"
      ]
    },
    {
      name: "Configuration",
      menu: ["include", "exclude", "babel"]
    },
    {
      name: "Libraries",
      menu: ["Definition Language", "Libraries Definition", "Custom Definition"]
    },
    {
      name: "Extra",
      menu: ["Frequently Asked Questions", "Newcomer Examples", "Next Steps"]
    }
  ],
  onCreateWebpackChain: config => {
    config.module
      .rule("css")
      .test(/\.css$/)
      .use("style")
      .loader("css-loader");

    config.resolve.alias
      // .set("@fonts", `${PUBLIC}/fonts`)
      .set("@images", `${PUBLIC}/images`)
      .set("@components", `${SRC}/theme/components`)
      .set("@styles", `${SRC}/theme/styles`);

    return config;
  },
  modifyBundlerConfig: oldConfig => merge(oldConfig, config)
};
