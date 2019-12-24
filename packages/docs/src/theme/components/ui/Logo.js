import React from "react";
import logo from "@images/logo.png";
// import symbol from "@images/symbol.svg";

export function Logo({ small, ...props }) {
  return <img {...props} src={logo} />;
}
