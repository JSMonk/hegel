import React from "react";
import styled, { css } from "styled-components";

import * as colors from "@styles/colors";
import { breakpoints } from "@styles/responsive";

const scales = {
  small: `
    padding: 5px 10px;
    font-size: 14px;
  `,
  normal: `
    padding: 10px 20px;
    font-size: 16px;
  `,
  big: `
    padding: 20px 30px;
    font-size: 18px;
    @media (max-width: ${breakpoints.tablet}px) {
      padding: 16px 26px;
      font-size: 16px;
    }
    @media (max-width: ${breakpoints.mobile}px) {
      padding: 14px 24px;
      font-size: 15px;
    }
  `
};

const kind = outline => (bg, color) => {
  const boxShadowColor = outline ? bg : "transparent";
  const backgroundColor = outline ? "transparent" : bg;

  return `
    background: ${backgroundColor};
    box-shadow: inset 0 0 0 1px ${boxShadowColor};
    color: ${outline ? bg : color};
    transition: all .3s;
    &:hover {
      box-shadow: inset 0 0 0 1000px ${boxShadowColor};
      color: ${color};
    }
    &:visited {
      color: ${color};
    }
  `;
};

const kinds = outline => {
  const get = kind(outline);

  return {
    primary: get(colors.purple, "white"),
    secondary: get(colors.ocean, "white"),
    cancel: get("#FF4949", "white"),
    dark: get(colors.main, "white"),
    gray: get(colors.gray, "white")
  };
};

const getScale = ({ scale = "normal" }) => scales[scale];
const getKind = ({ kind = "primary", outline = false }) => kinds(outline)[kind];

export const btnStyle = css`
  ${getKind};
  ${getScale};
  display: flex;
  align-items: center;
  cursor: pointer;
  margin: 3px 5px;
  border: none;
  border-radius: 3px;
  text-align: center;
`;

export const ButtonStyled = styled.button`
  ${btnStyle};
`;

export function Button({ children, ...props }) {
  return <ButtonStyled {...props}>{children}</ButtonStyled>;
}
