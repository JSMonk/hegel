import React from "react";
import { BaseStyle } from "./base";
import { PrismStyle } from "./prism-theme";
import { GithubBtnStyle } from "./github-button";

export function Global() {
  return (
    <React.Fragment>
      <BaseStyle />
      <GithubBtnStyle />
      <PrismStyle />
    </React.Fragment>
  );
}
