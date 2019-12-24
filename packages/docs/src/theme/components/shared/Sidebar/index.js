import React from "react";
import { useWindowSize } from "react-use";
import styled, { css } from "styled-components";
import { Entry, Link as BaseLink, useDocs, useMenus } from "docz";

import { ADSStyleSheet, addCarbonAds } from "./ads";
import { breakpoints } from "@styles/responsive";
import { MainContext } from "../Main";
import { TOPBAR_LINKS, IconLink } from "../Topbar";

const toggle = p => (!p.opened && p.mobile ? "-100%" : "0");

const SidebarWrapper = styled.div`
  width: 280px;
  height: 100%;
  min-width: 280px;
  height: 100%;
  padding: 20px 20px 20px 0;
  margin-right: 60px;
  border-right: 1px solid ${p => p.theme.colors.grayLight};
  background: #fff;
  transition: transform 0.2s, background 0.3s;
  transform: translateX(${toggle});
  ${p =>
    p.mobile &&
    css`
      position: absolute;
      top: 0;
      left: 0;
      overflow: auto;
      z-index: 9999;
      padding: 30px;
    `};
`;

const Wrapper = styled.div`
  position: -webkit-sticky;
  display: flex;
  flex-direction: column;
  width: 100%;
  ${p =>
    p.theme.mq({
      position: ["relative", "relative", "sticky", "sticky"],
      top: ["0px", "0px", "50px", "50px"]
    })};
`;

const Link = styled(BaseLink)`
  font-size: 16px;
  padding: 2px 0;
  &,
  &:visited {
    color: ${p => p.theme.colors.grayDark};
  }
  &.active,
  &:hover {
    color: ${p => p.theme.colors.purple};
  }
`;

const SmallLink = styled(BaseLink)`
  font-size: 14px;
  padding: 0 0 5px 10px;
  &,
  &.active,
  &:visited {
    color: ${p => p.theme.colors.gray};
  }
  &:hover {
    color: ${p => p.theme.colors.purple};
  }
`;

const Submenu = styled.div`
  display: flex;
  flex-direction: column;
  margin: 5px 0;
`;

const MenuGroup = styled.h2`
  margin: 30px 0 5px;
  font-size: 12px;
  opacity: 0.3;
  text-transform: uppercase;
  &:first-child {
    margin-top: 0;
  }
`;

const ToggleBackground = styled.div`
  content: "";
  display: ${p => (!p.opened ? "none" : "block")};
  position: fixed;
  background-color: rgba(0, 0, 0, 0.4);
  width: 100vw;
  height: 100vh;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  cursor: pointer;
  z-index: 98;
`;

function Menu({ doc, active, onClick }) {
  const headings = doc.headings.filter(
    heading => heading.depth > 1 && heading.depth < 3
  );

  return (
    <React.Fragment>
      <Link to={doc.route} onClick={onClick}>
        {doc.name}
      </Link>
      {active &&
        headings.length > 0 && (
          <Submenu>
            {headings.map(heading => (
              <SmallLink
                key={heading.slug}
                to={`${doc.route}#${heading.slug}`}
                onClick={onClick}
              >
                {heading.value}
              </SmallLink>
            ))}
          </Submenu>
        )}
    </React.Fragment>
  );
}

function TopbarMenu({ onClick }) {
  return (
    <React.Fragment>
      {TOPBAR_LINKS.map(({ id, children, ...props }) => {
        const Component = props.to ? Link : IconLink;
        return (
          <Component key={id} {...props} onClick={onClick}>
            {children}
          </Component>
        );
      })}
    </React.Fragment>
  );
}

export function Sidebar({ menu: current, pathname, mobile }) {
  const docs = useDocs();
  const { width } = useWindowSize();
  const { showing, setShowing } = React.useContext(MainContext);

  const menus = useMenus();
  const isDesktop = width > breakpoints.tablet;

  const toggle = React.useCallback(() => {
    setShowing(s => !s);
  }, []);

  const handleSidebarToggle = ev => {
    if (isDesktop) return;
    toggle && toggle();
  };

  React.useEffect(() => {
    addCarbonAds();
  }, []);

  return (
    <React.Fragment>
      <ADSStyleSheet />
      <SidebarWrapper opened={showing} mobile={Boolean(mobile)}>
        <div id="ads" />
        <Wrapper>
          {mobile && <TopbarMenu onClick={handleSidebarToggle} />}
          {menus &&
            menus.map(({ id, name, menu }) => {
              if (!menu) return null;
              return (
                <React.Fragment key={id}>
                  <MenuGroup>{name}</MenuGroup>
                  {menu.map(item => {
                    const doc =
                      docs && docs.find(doc => doc.name === item.name);
                    if (!doc) return null;
                    return (
                      <Menu
                        key={doc.id}
                        doc={doc}
                        active={Boolean(
                          pathname && pathname.includes(doc.route)
                        )}
                        onClick={handleSidebarToggle}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
        </Wrapper>
      </SidebarWrapper>
      {!isDesktop && (
        <ToggleBackground opened={showing} onClick={handleSidebarToggle} />
      )}
    </React.Fragment>
  );
}
