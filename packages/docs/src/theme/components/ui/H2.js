import styled from "styled-components";

export const H2 = styled.h2`
  position: relative;
  ${p => p.theme.styles.h2};
  code {
    padding: 10px 15px;
    font-size: 0.8em;
    color: ${p => p.theme.colors.grayDark};
  }
  .icon-link {
    position: absolute;
    display: inline-block;
    opacity: 0;
    transition: opacity 0.2s;
    ${p =>
      p.theme.mq({
        top: ["8px", "8px", "0", "0"],
        left: ["-15px", "-15px", "-25px", "-25px"],
        fontSize: ["25px", "25px", "inherit", "inherit"]
      })};
  }
  &:hover .icon-link {
    opacity: 1;
  }
`;
