import styled from "styled-components";

export const Code = styled.code`
  margin: 0 3px;
  padding: 3px 5px;
  border-radius: 3px;
  background: ${p => p.theme.colors.grayExtraLight};
  font-size: 16px;
  color: ${p => p.theme.colors.orange};
`;
