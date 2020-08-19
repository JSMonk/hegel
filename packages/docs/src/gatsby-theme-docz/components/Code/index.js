/** @jsx jsx */
/* eslint react/jsx-key: 0 */
import * as LZString from "lz-string";
import styled from "styled-components";
import { Link } from "gatsby";
import { MainLink } from "../Headings";
import { useCurrentDoc } from "docz";
import { jsx, Styled, useThemeUI } from "theme-ui";
import Highlight, { defaultProps } from "prism-react-renderer";

import { usePrismTheme } from "~utils/theme";

const Container = styled.div`
  display: flex;
  flex: 1;
  position: relative;
  margin-top: 32px;
  margin-bottom: 32px;

  & > pre {
    width: 100%;
    max-width: 100%;
    margin: 0;
  }

  & > a {
    position: absolute;
    font-size: 0.9em;
    top: 15px;
    right: 15px;
    margin: 0;
    opacity: 0;
  }

  &:hover {
    & > a {
      opacity: 1;
    }
  }
`;

export const Code = ({ children, className: outerClassName }) => {
  const [language] = outerClassName
    ? outerClassName.replace(/language-/, "").split(" ")
    : ["text"];

  const docs = useCurrentDoc();
  const theme = useThemeUI();
  const codeTheme = usePrismTheme();
  const encoded = LZString.compressToEncodedURIComponent(children);

  return (
    <Container>
      {docs.withoutPlayground || language !== "typescript" ? null : (
        <MainLink
          as={Link}
          target="_blank"
          mode={theme.colorMode}
          to={`/try#${encoded}`}
        >
          Playground
        </MainLink>
      )}
      <Highlight
        {...defaultProps}
        code={children.trim()}
        language={language}
        theme={codeTheme}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <Styled.pre
            className={`${outerClassName || ""} ${className}`}
            style={{ ...style, overflowX: "auto" }}
            data-testid="code"
          >
            {tokens.map((line, i) => (
              <div {...getLineProps({ line, key: i })}>
                {line.map((token, key) => (
                  <span
                    {...getTokenProps({ token, key })}
                    sx={{ display: "inline-block" }}
                  />
                ))}
              </div>
            ))}
          </Styled.pre>
        )}
      </Highlight>
    </Container>
  );
};
