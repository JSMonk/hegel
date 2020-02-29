import React from "react";
import styled from "styled-components";
import { Container } from "theme-ui";

const Section = styled.section``;

const List = styled.ul`
  margin: 0;
  padding: 20px 0;
  list-style: none;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 660px) {
     flex-direction: column;
  }
`;

const ListItem = styled.li`
  display: flex;
  flex-direction: column;
  flex-basis: 30%;
  justify-content: center;
  align-items: center;

  @media (max-width: 660px) ({
     margin: 20px 0;
  })
`;

const Title = styled.h2`
  text-align: center;
  margin: 10px 0;
  font-weight: bold;
`;

const Text = styled.p`
  text-align: center;
  margin: 10px 0;
  font-weight: 100;
`;

export function Features() {
  return (
    <Section>
      <Container>
        <List>
          <ListItem>
            <Title>No Runtime TypeErrors</Title>
            <Text>
              Hegel targets to prevent runtime TypeErrors by strong type
              system, great type inference and notify you about corner cases
            </Text>
          </ListItem>
          <ListItem>
            <Title>Easily Integrated</Title>
            <Text>
              Hegel is only JavaScript with types, so you don't need to use
              specific file extensions or comments to start working with it.
            </Text>
          </ListItem>
          <ListItem>
            <Title>Community-friendly</Title>
            <Text>
              Hegel is developing by community for community. So, your PRs and
              issues will not be ignored or skipped.
            </Text>
          </ListItem>
        </List>
      </Container>
    </Section>
  );
}
