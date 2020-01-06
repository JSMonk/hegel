import React from 'react'
import { useThemeUI } from "theme-ui";

import lightLogo from './logo-light.svg';
import darkLogo from './logo-dark.svg';

export function Logo() {
  const { colorMode } = useThemeUI();
  const logo = colorMode === "dark" ? lightLogo : darkLogo;
  return <img src={logo} alt="That's my logo" />;
}
