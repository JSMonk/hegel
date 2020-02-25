import React from "react";
import styled from "styled-components";
import { Link } from "gatsby";
import { Logo } from "gatsby-theme-docz/src/components/Logo";
import { Code } from "gatsby-theme-docz/src/components/Code";
import { Container, useThemeUI } from "theme-ui";

const HtmlMain = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 60vh;
  max-height: 800px;
  min-height: 500px;
  font-family: "Source Sans Pro", sans-serif;
  font-weight: 400; line-height: 1.5;
  color: ${props => (props.mode === "light" ? "#2D3747" : "#FFFFFF")};
  background-color: ${props =>
    props.mode === "light" ? "#F5F6F7" : "#13161F"};
  position: relative;
  z-index: 2;
  border-bottom: 1px solid
    ${props => (props.mode === "light" ? "#CED4DE" : "#2D3747")};

  & pre {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  & .token.function:not(.function-variable) {
    border-bottom: 2px dotted #d5382f;
  }

  & section:nth-child(2) {
    @media (max-width: 1200px) {
       display: none;
    }
  }
  & section {
    @media (max-width: 1200px) {
       align-items: center;
    }
  }
}
`;

const SpacedContainer = styled(Container)`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px 0 32px !important;
`;

const CenterContainer = styled(Container)`
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  max-height: 170px;
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

const MainLink = styled(Link)`
  border: 2px solid ${props => (props.mode === "light" ? "#2D3747" : "#CED4DE")};
  color: ${props => (props.mode === "light" ? "#2D3747" : "#CED4DE")};
  text-decoration: none;
  padding: 8px 24px;
  margin-right: 24px;
  transition: all 0.3s ease 0s, color 0.3s ease 0s;

  &:hover {
    color: ${props => (props.mode === "light" ? "#F5F6F7" : "#13161F")};
    background-color: ${props => (props.mode === "light" ? "#2D3747" : "#CED4DE")};
  }
`;

const CODE = `
const assertNumber = arg => {
  if (typeof arg !== "number") {
    throw new TypeError("Given argument is not a number");
  }
}

const assertExisting = (obj): $Throws<ReferenceError> => {
  if (typeof obj === "object" && obj !== null && "value" in obj) {
    //  Current function throws "TypeError" type which is incompatible...
    assertNumber(obj.value);
  }
};
`;

export function Main() {
  const { colorMode } = useThemeUI();
  return (
    <HtmlMain mode={colorMode}>
      <SpacedContainer>
        <Section>
          <Logo height="36%" mode={colorMode} />
          <Text>An advanced static type checker</Text>
        </Section>
        <Section>
          <Code className="language-typescript">{CODE}</Code>
        </Section>
      </SpacedContainer>
      <CenterContainer>
        <MainLink mode={colorMode} to="/docs">Get Started</MainLink>
        <MainLink mode={colorMode} to="/try">Try Online</MainLink>
      </CenterContainer>
    </HtmlMain>
  );
}
