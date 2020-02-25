import React from "react";
import styled from "styled-components";
import { useThemeUI, Container } from "theme-ui";

const HtmlFooter = styled.footer`
  border-top: 1px solid
    ${props => (props.mode === "light" ? "#CED4DE" : "#2D3747")};
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const Navigation = styled.nav`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border: 0;
  margin: 0;
  padding: 0;
  vertical-align: baseline;
  flex-flow: row nowrap;
  position: relative;
  text-align: left;
  flex: 1;
  padding: 0 20px;
`;

const NavLink = styled.a`
  display: flex;
  text-align: center;
  white-space: nowrap;
  font: inherit;
  color: inherit;
  vertical-align: baseline;
  text-decoration: none;
  flex-flow: row nowrap;
  align-items: center;
  box-sizing: border-box;
  justify-content: center;
  transition: background-color 0.3s;
  border: 0;
  font-size: 1rem;
  font-weight: 300;
  line-height: 1.2em;
`;

const Wrapper = styled(Container)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px !important;
`;

export function Footer() {
  const { colorMode } = useThemeUI();
  const currentDate = new Date();
  // eslint-disable-next-line
  const licenseLink = `${REPOSITORY}/blob/master/LICENSE`;
  return (
    <HtmlFooter mode={colorMode}>
      <Wrapper>
        <Navigation>
          <List>
            <li>
              <NavLink target="_blank" href={licenseLink}>
                Distributed under MIT License
              </NavLink>
            </li>
          </List>
        </Navigation>
        <p>© 2019 - {currentDate.getFullYear()} Artem Kobzar</p>
      </Wrapper>
    </HtmlFooter>
  );
}
