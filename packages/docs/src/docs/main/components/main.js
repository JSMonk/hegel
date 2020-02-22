import React from "react";
import styled from "styled-components";
import { Logo } from "gatsby-theme-docz/src/components/Logo";
import { Code } from "gatsby-theme-docz/src/components/Code";
import { Container, useThemeUI } from "theme-ui";

const HtmlMain = styled.main`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-height: 50vh;
  max-height: 600px;
  font-family: "Source Sans Pro", sans-serif;
  font-weight: 400;
  line-height: 1.5;
  color: ${props => (props.mode === "light" ? "#2D3747" : "#FFFFFF")};
  background-color: ${props =>
    props.mode === "light" ? "#F5F6F7" : "#13161F"};
  position: relative;
  z-index: 2;
  border-bottom: 1px solid
    ${props => (props.mode === "light" ? "#CED4DE" : "#2D3747")};
`;

const WrappedContainer = styled(Container)`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Section = styled.section`
  height: 100%;
  display: flex;
  flex: 1;
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
`;

const Text = styled.p`
  font-size: 1.6rem;
  margin: 0;
  padding-left: 1.3%;
  text-align: center;
`;

const CODE = `
const assertNumber = arg => {
  if (typeof arg !== "number") {
    throw new TypeError("Given argument is not a number");
  }
}

const assertExisting = (obj): $Throws<ReferenceError> => {
  if (typeof obj === "object" && obj !== null && "value" in obj) {
    assertNumber(obj.value);
  }
};
`;

export function Main() {
  const { colorMode, setColorMode } = useThemeUI();
  return (
    <HtmlMain mode={colorMode}>
      <WrappedContainer>
        <Section>
          <Logo height="36%" mode={colorMode} />
          <Text>An advanced static type checker</Text>
        </Section>
          <Section>
          <Code className="language-typescript">
            {CODE}
          </Code>
          </Section>
      </WrappedContainer>
    </HtmlMain>
  );
}
