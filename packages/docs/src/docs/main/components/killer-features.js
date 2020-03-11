import React from "react";
import styled from "styled-components";
import { Code } from "gatsby-theme-docz/src/components/Code";
import { Container as OriginalContainer, useThemeUI } from "theme-ui";

const Wrapped = styled.div`
  display: flex;
  align-items: center;
  flex-basis: 70%;
  max-width: 100%;
  position: relative;
  height: 100%;

  @media (max-width: 1198px) {
     flex-basis: 100%;
     height: auto;
  }
`;

const Section = styled.section`
  background-color: ${props =>
    props.mode === "dark" ? "#2D3747" : "#CED4DE"};

  & li::before {
    background-color: ${props => props.mode === "dark" ? "#13161f" : "#f6f8fa"}
  }
  & li ${Wrapped} {
    background-color: ${props => props.mode === "dark" ? "#13161f" : "#f6f8fa"}
  }
`;

const Container = styled(OriginalContainer)`
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  display: flex;
  position: relative;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: center;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  & > li:nth-child(2n) > div {
    flex-direction: row-reverse;
  }
  & > li:nth-child(2n + 1)::before {
    left: 50%;
  }
  
  @media (max-width: 1198px) {
     padding-bottom: 20px;
  }
`;

const ListItem = styled.li`
  margin: 0;
  padding: 0;
  position: relative;
  display: flex;
  min-height: 500px;
  & * {
    z-index: 1;
  }
  &::before {
    content: '';
    top: 0;
    left: 0;
    position: absolute;
    display: flex;
    width: 50%;
    z-index: 0;
    height: 100%;
    
    @media (max-width: 1198px) {
       display: none;
    }
  }
  @media (max-width: 1198px) {
     min-height: auto;
  }
`;

const Title = styled.h2`
  display: flex;
  flex-basis: 30%;
  align-items: center;
  justify-content: center;
  margin: 0;
  min-height: 130px;
  @media (max-width: 1198px) {
     flex-basis: 100%;
  }
`;

const Errored = styled.div`
  width: 100%;
  position: relative;
  margin: 0;
  & > pre {
    margin: 0;
    border-radius: 0;
  }
  ${props =>
    !props.error
      ? ""
      : `& ${props.error} {
     border-bottom: 2px dotted #d5382f;
     display: inline-block;
 } `};
`;

const SOUNDNESS_CODE = `
const numbers: Array<number> = [];
// Error: Type "Array<number>" is incompatible with type "Array<number | string>"
const numbersOrStrings: Array<string | number> = numbers;
numbersOrStrings.push("Hello, TypeError!");
const integers = numbers.map(num => Number(num.toFixed(0)));
// Error: Property "toLocaleString" does not exist in "Number | undefined"
const helloOneMoreTypeError = integers[1].toLocaleString();`;

const STRONG_TYPE_SYSTEM_CODE = `function provideNumber(providedData: ?number) {
  // Error: Type "number | undefined" is incompatible with type "boolean"
  if (!providedData) {
    // Oops you lost "0"
    throw new TypeError("Number was not provided");
  }
  return providedData;
}

provideNumber(0);
`;

const TYPE_INFERENCE_CODE = `// Inferenced as "<q', c'>((c') => q') => (c') => Promise<q'>"
const promisify = fn => arg => Promise.resolve(fn(arg));
// Inferenced as "<c'>(c') => Promise<c'>"
const id = promisify(x => x);
// Inferenced as "Promise<string>"
const upperStr = id("It will be inferenced").then(str => str.toUpperCase());
// Inferenced as "Promise<number>"
const twicedNum = id(42).then(num => num ** 2);`;

const TYPED_ERRORS_CODE = `// Inferenced type "(unknown) => undefined throws TypeError"
function assertNumber(arg) {
  if (typeof arg !== "number") {
    throw new TypeError("Given arg is not a number");
  }
}
// Inferenced type "(unknown) => undefined throws ReferenceError | TypeError"
function assertField(obj) {
  if (typeof obj === "object" && obj !== null && "value" in obj) {
    assertNumber(obj.value)
  }
  throw new ReferenceError('"value" property doesn\\'t exist');
}

try {
  assertField({});
} catch(error) {
  // error type is "ReferenceError | TypeError | unknown"
}`;

export function KillerFeatures() {
  const { colorMode } = useThemeUI();
  return (
    <Section mode={colorMode}>
      <List>
        <ListItem>
          <Container>
            <Title>Soundness</Title>
            <Wrapped>
              <Errored error=".token-line:nth-child(3),.token-line:nth-child(7)">
                <Code className="language-typescript">{SOUNDNESS_CODE}</Code>
              </Errored>
            </Wrapped>
          </Container>
        </ListItem>
        <ListItem>
          <Container>
            <Title>Strong Type System</Title>
            <Wrapped>
              <Errored error=".token.operator+.token.plain">
                <Code className="language-typescript">
                  {STRONG_TYPE_SYSTEM_CODE}
                </Code>
              </Errored>
            </Wrapped>
          </Container>
        </ListItem>
        <ListItem>
          <Container>
            <Title>Type Inference</Title>
            <Wrapped>
              <Errored>
                <Code className="language-typescript">{TYPE_INFERENCE_CODE}</Code>
              </Errored>
            </Wrapped>
          </Container>
        </ListItem>
        <ListItem>
          <Container>
            <Title>Typed Errors</Title>
            <Wrapped>
              <Errored>
                <Code className="language-typescript">{TYPED_ERRORS_CODE}</Code>
              </Errored>
            </Wrapped>
          </Container>
        </ListItem>
      </List>
    </Section>
  );
}
