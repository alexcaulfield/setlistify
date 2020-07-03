import React from 'react';
import {Card, Icon, Container} from "semantic-ui-react";

interface HeaderProps {
  name?: string,
}

const HeaderCard = ({name= ''}: HeaderProps) => {
  return (
    <Container>
      <Card fluid centered>
        <Card.Content>
          {!!name ? (
            <>
              <Card.Header>{name}</Card.Header>
            </>
          ) : (
            <Icon name='music' size='big' />
          )}
        </Card.Content>
      </Card>
    </Container>
  )
};

export default HeaderCard;

