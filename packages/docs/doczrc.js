export default {
  title: "Hegel",
  description: "Feel power of types",
  indexHtml: "public/index.html",
  typescript: false,
  propsParser: false,
  mdPlugins: [],
  ignore: ["src/gatsby-theme-docz/**"],
  public: "./public",
  themeConfig: {
    useColorSchemeMediaQuery: true
  },
  menu: [
    {
      name: "Intro",
      menu: ["What & Why"]
    },
    {
      name: "Setup",
      menu: ["Installation", "Editor Plugins"]
    },
    {
      name: "Type Annotations",
      menu: [
        "Type Annotations",
        "Primitive Types",
        "Unknown Type",
        "Optional Types",
        "Union Types",
        "Function Types",
        "Object Types",
        "Class Types",
        "Array Types",
        "Tuple Types",
        "Type Aliases",
        "Generic Types",
        "Magic Types",
        "Modules"
      ]
    },
    {
      name: "Type System",
      menu: [
        "No Any",
        "Type Compatibility",
        "Type Inference",
        "Type Refinement"
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
  ]
};
