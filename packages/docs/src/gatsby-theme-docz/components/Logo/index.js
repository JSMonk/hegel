import React from 'react'
import lightLogo from './logo-light.svg';
import darkLogo from './logo-dark.svg';

export function Logo({ mode }) {
  const logo = mode === "dark" ? lightLogo : darkLogo;
  return <img src={logo} height="35px" alt="That's my logo" />;
}
