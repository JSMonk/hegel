/** @jsx jsx */
import { Global } from "@emotion/core";
import { useCurrentDoc } from "docz";
import React, { useRef, useState } from "react";
import { jsx, Layout as BaseLayout, Main, Container } from "theme-ui";

import global from "~theme/global";
import { Header } from "../Header";
import { Sidebar } from "gatsby-theme-docz/src/components/Sidebar";
import * as styles from "gatsby-theme-docz/src/components/Layout/styles";

export const Layout = ({ children }) => {
  const docs = useCurrentDoc();
  const [open, setOpen] = useState(false);
  const nav = useRef();
  const wrapper = docs.fullpage
    ? { ...styles.wrapper, gridTemplateColumns: undefined }
    : styles.wrapper;
  return (
    <BaseLayout sx={{ "& > div": { flex: "1 1 auto" } }} data-testid="layout">
      <Global styles={global} />
      <Main sx={styles.main}>
        <Header onOpen={() => setOpen(s => !s)} />
        <div sx={wrapper}>
          {docs.fullpage ? null : (
            <Sidebar
              ref={nav}
              open={open}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onClick={() => setOpen(false)}
            />
          )}
          <Container sx={styles.content} data-testid="main-container">
            {children}
          </Container>
        </div>
      </Main>
    </BaseLayout>
  );
};
