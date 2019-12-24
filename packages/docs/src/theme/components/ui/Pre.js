import "@styles/prism-theme";
import "prismjs";
import "prismjs/components/prism-json.min";
import "prismjs/components/prism-jsx.min";
import "prismjs/components/prism-bash.min";
import "prismjs/components/prism-markdown.min";
import "prismjs/components/prism-typescript.min";

import React from "react";
import cx from "classnames";
import prism from "prismjs";
import styled from "styled-components";

const PreStyled = styled.pre`
  ${p => p.theme.styles.pre};
`;

export function Pre({ children, className }) {
  const preRef = React.useRef(null);
  const hasChildren = children && children.props;
  const childrenProps = hasChildren && children.props.props;
  const childrenClassName = childrenProps && childrenProps.className;

  React.useEffect(() => {
    preRef && preRef.current && prism.highlightElement(preRef.current);
  });

  return (
    <PreStyled
      ref={preRef}
      className={cx("react-prism", className, childrenClassName)}
    >
      {hasChildren ? children.props.children : children}
    </PreStyled>
  );
}
