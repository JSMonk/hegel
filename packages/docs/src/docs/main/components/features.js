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
              Hegel tries to prevent runtime TypeErrors by strong type
              system, great type inference and notify you about corner cases
              {// Я бы вместо "Hegel tries to prevent" написал бы - "Hegel prevents". Более уверено звучит) //}
            </Text>
          </ListItem>
          <ListItem>
            <Title>Easy Integration</Title>
            {// Если ты имел ввиду "Легкая интеграция", то ок, а если "Легко интегрируемый", то - "Easily Integrated" //}
            <Text>
              Hegel is only JavaScript with types, so you don't need to use
              specific file extensions or comments to start working with them.
              {/* "with them" - это ты имел ввиду типы или с самим Хегелем?
              Если с типами, то ок, а если с Хегелем, то - "it" вместо "them" */}
            </Text>
          </ListItem>
          <ListItem>
            <Title>Community-friendly</Title>
            <Text>
              Hegel are developing by community for community. So, your PRs and
              issues will not be ignored or skipped.
              {/* "Hegel are developing" - я бы лучше написал "Hegel is developed". 
              Если ты имелл ввиду "разработан", а если "в данный момент раздабатывается", то - "Hegel is developing" */}
            </Text>
          </ListItem>
        </List>
      </Container>
    </Section>
  );
}
