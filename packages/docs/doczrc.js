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
    useColorSchemeMediaQuery: true,
    initialColorMode: "dark"
  },
  menu: [
     "What & Why",
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
      menu: ["Type Compatibility", "Type Inference", "Type Refinement"]
    },
    "Configuration",
    "Libraries",
  ]
};
