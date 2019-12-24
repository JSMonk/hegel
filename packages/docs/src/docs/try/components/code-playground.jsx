import React from "react";
import { useThemeUI } from "theme-ui";
import { buildAndMountEditor } from "./monaco";
import "monaco-editor/min/vs/editor/editor.main.css";

const EDITOR_ID = "editor--container";

export function CodePlayground(props) {
  const [editor, setEditor] = React.useState(null);
  const { colorMode } = useThemeUI();
  React.useEffect(() => {
    buildAndMountEditor(setEditor, colorMode, EDITOR_ID);
    return () => {
      if (editor) {
        editor.dispose();
      }
    };
  }, []);
  React.useEffect(
    () => {
      if (editor) {
        editor.setTheme(colorMode);
      }
    },
    [colorMode, editor]
  );
  return <div id={EDITOR_ID} style={{ width: "100%", height: "100%" }} />;
}
