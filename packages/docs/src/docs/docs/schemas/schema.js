import React from "react";
import styled from "styled-components";
import { useThemeUI } from "theme-ui";
import darkHierarchySchema from "./type-hierarchy-dark.svg";
import lightHierarchySchema from "./type-hierarchy-light.svg";

const ImageContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin: 20px 0px;

  & > img {
    margin-left: -20%;
    max-width: 100%;
  }
`;

const SCHEMA_TYPES = {
  hierarchy: {
    dark: darkHierarchySchema,
    light: lightHierarchySchema,
  },
};

export function Schema({ type }) {
  const { colorMode, setColorMode } = useThemeUI();
  return (
    <ImageContainer>
      <img src={SCHEMA_TYPES[type][colorMode]} />
    </ImageContainer>
  );
}
