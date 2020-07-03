import React from 'react';
import { Card, Placeholder, Container, Button, Loader } from 'semantic-ui-react';

const LoadingPlaceholder = () => (
  <Container>
    <Card centered>
      <Card.Content>
        <Placeholder>
          <Placeholder.Image square />
        </Placeholder>
      </Card.Content>
    </Card>
    <Button
      disabled
    >
      <Loader size="small"/>
    </Button>
  </Container>
);

export default LoadingPlaceholder;