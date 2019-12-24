import React from "react";
import { ThemeProvider } from "styled-components";
import { theme, ComponentsProvider, useConfig } from "docz";

import { config } from "./config";
import { mq, breakpoints } from "@styles/responsive";
import { Global } from "@styles/global";
import { Main } from "@components/shared";
import * as components from "@components/ui";

const map = {
  page: components.Page,
  loading: components.Loading,
  h1: components.H1,
  h2: components.H2,
  h3: components.H3,
  h4: components.H4,
  h5: components.H5,
  h6: components.H6,
  hr: components.Hr,
  img: components.Image,
  ul: components.List,
  pre: components.Pre,
  inlineCode: components.Code,
  blockquote: components.Blockquote
};

const Theme = ({ children }) => {
  const config = useConfig();
  return (
    <ThemeProvider theme={{ ...config.themeConfig, mq, breakpoints }}>
      <ComponentsProvider components={map}>
        <Main>
          <Global />
          {children}
        </Main>
      </ComponentsProvider>
    </ThemeProvider>
  );
};

export default theme(config)(Theme);
