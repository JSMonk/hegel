export default {
  title: "Hegel",
  description: "Feel power of types",
  indexHtml: "public/index.html",
  typescript: false,
  propsParser: false,
  mdPlugins: [],
  ignore: ["src/gatsby-theme-docz/**"],
  public: "./public",
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
};
