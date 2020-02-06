import React from "react";
import styled from "styled-components";
import { CodePlayground } from "./code-playground";

const Container = styled.div`
  height: 70vh;
  width: 100%;
  max-width: 1330px;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h2`
  text-align: center;
  margin: 30px 0;
`;

export function TryHegel() {
  return (
    <Container>
      <Title id="try-hegel">Try Hegel in your browser</Title>
      <CodePlayground />
    </Container>
  );
}
