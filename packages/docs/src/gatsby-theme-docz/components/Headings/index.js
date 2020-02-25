/** @jsx jsx */
import React from "react";
import styled from "styled-components";
import { Link } from "gatsby";
import { useCurrentDoc } from "docz";
import { jsx, useThemeUI } from "theme-ui";

const Container = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;

  & > h1 {
    padding: 0;
    margin: 0;
    margin-bottom: 16px;
    font-size: 48px;
    font-family: "Source Sans Pro", sans-serif;
    line-height: 1.125;
    font-weight: 700;
  }
`;

const MainLink = styled.a`
  border: 2px solid ${props => (props.mode === "light" ? "#2D3747" : "#CED4DE")};
  color: ${props => (props.mode === "light" ? "#2D3747" : "#CED4DE")};
  text-decoration: none;
  padding: 5px 20px;
  margin-right: 24px;
  transition: all 0.3s ease 0s, color 0.3s ease 0s;

  &:hover {
    color: ${props => (props.mode === "light" ? "#F5F6F7" : "#13161F")};
    background-color: ${props =>
      props.mode === "light" ? "#2D3747" : "#CED4DE"};
  }
`;

const heading = Tag => {
  const Component = props => {
    return !!props.id ? (
      <Tag {...props}>
        <a
          href={`#${props.id}`}
          sx={{
            color: "inherit",
            textDecoration: "none",
            ":hover": {
              textDecoration: "underline"
            }
          }}
        >
          {props.children}
        </a>
      </Tag>
    ) : (
      <Tag {...props} />
    );
  };

  Component.displayName = Tag;
  return Component;
};

export const h2 = heading("h2");
export const h3 = heading("h3");
export const h4 = heading("h4");
export const h5 = heading("h5");
export const h6 = heading("h6");

const HtmlH1 = heading("h1");

function H1(props) {
  const docs = useCurrentDoc();
  const { colorMode } = useThemeUI();
  const title = <HtmlH1 {...props}>{props.children}</HtmlH1>;
  // eslint-disable-next-line
  const linkToEdit = `${REPOSITORY}/edit/master/packages/docs/${docs.filepath}`;
  return docs.withoutEdit ? (
    title
  ) : (
    <Container>
      {title}{" "}
      <MainLink target="_blank" href={linkToEdit}>
        Edit
      </MainLink>
    </Container>
  );
}

export const h1 = H1;
