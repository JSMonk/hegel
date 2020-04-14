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
// Error: Property "toFixed" does not exist in "Number | undefined" 
numbers[1].toFixed(1);`;

const STRONG_TYPE_SYSTEM_CODE = `function assertNumber(num: ?number) {
  // Error: Type "number | undefined" is incompatible with type "boolean"
  if (!num) {
    // Oops you lost "0"
    throw new TypeError("Number was not provided");
  }
  return num;
}

assertNumber(0);`;

const TYPE_INFERENCE_CODE = `// Hegel will infer "promisify" as "<_q, _c>((_c) => _q) => (_c) => Promise<_q>"
const promisify = fn => arg => Promise.resolve(fn(arg));
// There, Hegel will infer "<_c>(_c) => Promise<_c>"
const id = promisify(x => x);
// And "upperStr" will be inferred as "Promise<string>"
const upperStr = id("It will be inferred").then(str => str.toUpperCase());
// Finally, "twiceNum" will be inferred as "Promise<number>"
const twicedNum = id(42).then(num => num ** 2);`;

const TYPED_ERRORS_CODE = `
function assert(age) {
  if (typeof age !== "number") {
    throw new TypeError("Age is not number.");
  } 
  if (age <= 0) {
    throw new ReferenceError("Age can't be less or equals zero.");
  }
}

try {
  assert(0);
} catch(error) {
  // So, as a result, "error" variable type will be "ReferenceError | TypeError | unknown"
}`;

export function KillerFeatures() {
  const { colorMode } = useThemeUI();
  return (
    <Section mode={colorMode}>
      <List>
        <ListItem id="soundness">
          <Container>
            <Title>Soundness</Title>
            <Wrapped>
              <Errored error=".token-line:nth-child(3),.token-line:nth-child(6)">
                <Code className="language-typescript">{SOUNDNESS_CODE}</Code>
              </Errored>
            </Wrapped>
          </Container>
        </ListItem>
        <ListItem id="strong-type-system">
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
        <ListItem id="type-inference">
          <Container>
            <Title>Type Inference</Title>
            <Wrapped>
              <Errored>
                <Code className="language-typescript">{TYPE_INFERENCE_CODE}</Code>
              </Errored>
            </Wrapped>
          </Container>
        </ListItem>
        <ListItem id="typed-errors">
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
