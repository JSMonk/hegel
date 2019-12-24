import React from "react";
import Github from "react-feather/dist/icons/github";
import { Link } from "docz";
import { useWindowSize } from "react-use";
import styled, { css } from "styled-components";
import { Hamburguer } from "@components/shared/Sidebar/Hamburguer";
import { breakpoints } from "@styles/responsive";
import { MainContext } from "../Main";
import { Container, Logo } from "@components/ui";

const Wrapper = styled.div`
  z-index: 999;
  width: 100%;
  position: fixed;
  height: 60px;
  background-image: linear-gradient(to right, #92fe9d 0%, #00c9ff 100%);
  ${Container} {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    ${p =>
      p.theme.mq({
        padding: ["0 14px", "0 20px", "0 20px", "0 20px"]
      })};
  }
`;

const LogoLink = styled(Link)`
  height: 30px;
`;

const Menu = styled.div`
  display: flex;
`;

const linkStyle = p => css`
  color: ${p.theme.colors.main};
  opacity: 0.5;
  transition: opacity 0.2s;
  font-size: 15px;
  font-weight: 400;
  &.active,
  &:visited,
  &:hover {
    color: ${p.theme.colors.main};
    opacity: 1;
  }
`;

const MenuLink = styled(Link)`
  ${linkStyle};
  margin: 0 10px;
`;

export const IconLink = styled.a`
  ${linkStyle};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 0 20px;
  svg {
    stroke: ${p => p.theme.colors.main};
  }
`;

export const TOPBAR_LINKS = [
  {
    id: 1,
    children: "Home",
    to: "/"
  },
  {
    id: 2,
    children: "Documentation",
    to: "/docs/getting-started"
  },
  // {
  //   id: 3,
  //   children: 'Plugins',
  //   to: '/plugins',
  // },
  {
    id: 4,
    children: "Themes",
    to: "/themes"
  }
];

export function Topbar() {
  const { width } = useWindowSize();
  const showFullMenu = width > breakpoints.tablet;
  const { showing, setShowing } = React.useContext(MainContext);

  return (
    <Wrapper>
      <Container>
        <LogoLink to="/">
          <Logo height={30} small={!showFullMenu} />
        </LogoLink>
        <Menu>
          {showFullMenu &&
            TOPBAR_LINKS.map(({ id, children, ...props }) => {
              const Component = props.to ? MenuLink : IconLink;
              return (
                <Component key={id} {...props}>
                  {children}
                </Component>
              );
            })}
          <IconLink
            as="a"
            href="https://medium.com/doczoficial"
            target="_blank"
          >
            Blog
          </IconLink>
          <IconLink
            as="a"
            href="https://github.com/pedronauck/docz"
            target="_blank"
          >
            <Github width={30} />
          </IconLink>
          {!showFullMenu && (
            <Hamburguer opened={showing} onClick={() => setShowing(s => !s)} />
          )}
        </Menu>
      </Container>
    </Wrapper>
  );
}
