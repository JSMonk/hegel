import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useThemeUI } from "theme-ui";
import DARK_FAVICON from "./favicon-dark.png";
import LIGHT_FAVICON from "./favicon-light.png";

export default function Wrapper({ children }) {
  const { setColorMode } = useThemeUI();
  const [favicon, changeFavicon] = useState(DARK_FAVICON);
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const darkMatcher = window.matchMedia("(prefers-color-scheme: dark)");
        const switchFavicon = () => {
            changeFavicon(darkMatcher.matches ? DARK_FAVICON : LIGHT_FAVICON);
            setColorMode(darkMatcher.matches ? "dark" : "light");
        };
      darkMatcher.addListener(switchFavicon);
      switchFavicon();
      return () => darkMatcher.removeListener(switchFavicon);
    }
  }, []);
  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/png" href={favicon} />
      </Helmet>
      {children}
    </>
  );
}
