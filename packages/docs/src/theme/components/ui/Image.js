import React from "react";
import styled from "styled-components";
import Lightbox from "react-images";

const Wrapper = styled.div`
  position: relative;
  margin: 30px 0;
  border: 1px solid ${p => p.theme.colors.grayLight};
`;

const ImageStyled = styled.img`
  display: block;
  width: 100%;
  padding: 5px;
`;

export function Image(props) {
  const [opened, setOpened] = React.useState(false);
  const toggle = () => setOpened(s => !s);

  return (
    <Wrapper>
      <ImageStyled {...props} />
      {opened && (
        <Lightbox
          images={[{ src: props.src }]}
          isOpen={opened}
          onClose={toggle}
        />
      )}
    </Wrapper>
  );
}
