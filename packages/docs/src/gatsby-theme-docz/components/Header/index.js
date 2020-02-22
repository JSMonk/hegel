import Sun from "react-feather/dist/icons/sun";
import React from "react";
import styled from "styled-components";
import { Link } from "gatsby";
import { Logo } from "../Logo";
import { useThemeUI } from "theme-ui";
import { useCurrentDoc } from "docz";

const HEADER_HEIGHT = 50;

const HtmlHeader = styled.header`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: ${HEADER_HEIGHT}px;
  width: 100%;
  font-family: "Source Sans Pro", sans-serif;
  font-weight: 400;
  line-height: 1.5;
  color: ${props => (props.mode === "light" ? "#2D3747" : "#CED4DE")};
  background-color: ${props =>
    props.mode === "light" ? "#F5F6F7" : "#13161F"};
  position: relative;
  z-index: 2;
  border-bottom: 1px solid
    ${props =>
      props.withoutBorder
        ? "transparent"
        : props.mode === "light"
          ? "#CED4DE"
          : "#2D3747"};
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

const Container = styled.nav`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Toggle = styled.button`
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  outline: none;
  border: none;
  border-radius: 50%;
  font-weight: 600;
  cursor: pointer;
  color: #ffffff;
  background-color: ${props =>
    props.mode === "light" ? "#0B5FFF" : "#1FB6FF"};
`;

const List = styled.ul`
  text-align: left;
  border: 0;
  font-size: 100%;
  vertical-align: baseline;
  box-sizing: border-box;
  list-style: none;
  background: none;
  display: flex;
  flex-flow: row nowrap;
  margin: 0;
  padding: 0;
  width: auto;
  line-height: 1.5;
  font-weight: 300;
  font-family: "Google Sans", "Roboto", sans-serif;
  position: relative;
  padding: 0 15px;
`;

const ListItem = styled.li`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  box-sizing: border-box;
  justify-content: center;
  border: 0;
  margin: 0;
  padding: 6px 10px;
`;

const NavLink = styled(Link)`
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

export function Header() {
  const { colorMode, setColorMode } = useThemeUI();
  const toggleMode = () =>
    setColorMode(colorMode === "light" ? "dark" : "light");
  const docs = useCurrentDoc();
  return (
    <HtmlHeader mode={colorMode} withoutBorder={docs.main}>
      <Navigation>
        <NavLink to="/">
          {docs.main ? null : <Logo mode={colorMode} height={35} />}
        </NavLink>
        <Container>
          <List>
            <ListItem>
              <NavLink to="/docs">Docs</NavLink>
            </ListItem>
            <ListItem>
              <NavLink to="/try">Try</NavLink>
            </ListItem>
            <ListItem>
              <NavLink>Community</NavLink>
            </ListItem>
            <ListItem>
              <NavLink
                as="a"
                href="https://github.com/JSMonk/hegel"
                target="_blank"
              >
                GitHub
              </NavLink>
            </ListItem>
          </List>
          <Toggle mode={colorMode} onClick={toggleMode}>
            <Sun size={15} />
          </Toggle>
        </Container>
      </Navigation>
    </HtmlHeader>
  );
}
