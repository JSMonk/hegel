import React from "react";
import styled from "styled-components";
import lightLogo from "./logo-light.svg";
import darkLogo from "./logo-dark.svg";

const Image = styled.img`
  min-height: ${props => isNaN(props.height) ? "100px" : props.height}
  max-height: 170px;
`;

export function Logo({ mode, style, height }) {
  const logo = mode === "dark" ? lightLogo : darkLogo;
  return (
    <Image src={logo} height={height} alt="Hegel Logo" />
  );
}
