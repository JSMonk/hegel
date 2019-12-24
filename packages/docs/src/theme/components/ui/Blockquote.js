import styled from "styled-components";

export const Blockquote = styled.blockquote`
  padding: 10px 30px 10px 30px;
  margin: 30px 0;
  border-radius: 3px;
  border-left: 4px solid ${p => p.theme.colors.primary};
  background: ${p => p.theme.colors.grayExtraLight};
  color: ${p => p.theme.colors.grayDark};
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-size: 22px;
    margin: 15px 0;
  }
  p {
    margin: 5px 0 10px;
  }
`;
