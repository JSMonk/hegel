import styled from "styled-components";

export const H3 = styled.h3`
  ${p => p.theme.styles.h3};
  code {
    font-size: 22px;
    color: ${p => p.theme.colors.grayDark};
    padding: 5px 10px;
  }
`;
