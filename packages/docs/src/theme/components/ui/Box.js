import styled from "styled-components";

export const Box = styled.div`
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid ${p => p.theme.colors.gray};
  border-radius: 5px;
`;
