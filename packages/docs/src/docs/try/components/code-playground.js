import React from "react";
import styled from "styled-components";
import { useThemeUI } from "theme-ui";
import { buildAndMountEditor } from "./monaco";
import "monaco-editor/min/vs/editor/editor.main.css";

const EDITOR_ID = "editor--container";

const Border = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: 5px;
  padding: 30px 10px 30px 0;
  border: 1px solid ${props => (props.mode === "light" ? "#ced4de" : "#2d3747")};
  background-color: ${props =>
    props.mode === "light" ? "#f5f6f7" : "#13161f"};
`;

const PlaygroundContainer = styled.div`
  width: 100%;
  height: 100%;
`;

export function CodePlayground() {
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
  return (
    <Border mode={colorMode}>
      <PlaygroundContainer id={EDITOR_ID} />
    </Border>
  );
}
