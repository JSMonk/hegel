import React from "react";
import styled from "styled-components";
import { ButtonStyled, ButtonProps } from "./Button";

const Link = styled(ButtonStyled)`
  display: block;
  text-align: center;
`;

export function ButtonLink({ className, ...props }) {
  return <Link as="a" className={className} {...props} />;
}
