import React from "react";
import { breakpoints } from "@styles/responsive";
import { useWindowSize } from "react-use";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

export const MainContext = React.createContext(null);

export const Main = ({ children }) => {
  const [showing, setShowing] = React.useState(false);
  const { width } = useWindowSize();

  React.useEffect(
    () => {
      if (typeof window !== "undefined") {
        const body = document.querySelector("body");
        const method = showing ? "add" : "remove";
        body && body.classList[method]("with-overlay");
      }
    },
    [showing]
  );

  React.useEffect(
    () => {
      if (width > breakpoints.tablet) {
        const body = document.querySelector("body");
        body && body.classList.remove("with-overlay");
        setShowing(false);
      }
    },
    [width]
  );

  return (
    <MainContext.Provider value={{ showing, setShowing }}>
      <Wrapper>{children}</Wrapper>
    </MainContext.Provider>
  );
};
