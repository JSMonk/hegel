import React from "react";
import styled from "styled-components";

const IconFirst = p => (!p.opened ? "0px" : "10px");
const IconMiddle = p => (!p.opened ? "1" : "0");
const IconLast = p => (!p.opened ? "0px" : "-6px");
const IconRotate = p => (!p.opened ? "0deg" : "45deg");

const Icon = styled.div`
  position: relative;
  width: 23px;
  height: 32px;
  margin: auto;
  background: transparent;
  transform: translateX(${p => (p.opened ? "-2px" : "-1px")})
    translateY($(p => (p.opened ? "0" : "2px")})
    scale(${p => (p.opened ? 0.8 : 1)});
`;

const IconLine = styled.span`
  content: "";
  display: block;
  position: absolute;
  width: 100%;
  height: 2px;
  left: 0;
  right: 0;
  background: ${p => p.theme.colors.text};
  transition: transform 0.3s, opacity 0.3s;
  &:nth-child(1) {
    top: -2px;
    transform: translateY(${IconFirst}) rotate(${IconRotate});
  }
  &:nth-child(2) {
    top: 6px;
    opacity: ${IconMiddle};
  }
  &:nth-child(3) {
    top: 14px;
    transform: translateY(${IconLast}) rotate(-${IconRotate});
  }
`;

const ToggleButton = styled.button`
  cursor: pointer;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 6px;
  margin-left: 10px;
  width: 42px;
  height: 30px;
  transition: transform 0.3s;
  outline: none;
  border: none;
  background: transparent;
`;

export function Hamburguer({ opened, onClick }) {
  return (
    <ToggleButton opened={opened} onClick={onClick}>
      <Icon opened={opened}>
        <IconLine opened={opened} />
        <IconLine opened={opened} />
        <IconLine opened={opened} />
      </Icon>
    </ToggleButton>
  );
}
