import React from 'react';
import {Container, Grid, Header as SemanticHeader, Icon, Menu, Segment} from "semantic-ui-react";

const BasicHeader = () => (
  <Segment
    inverted
    textAlign='center'
    vertical
  >
    <Menu
      fixed='top'
      size='large'
    >
      <Container>
        <Menu.Item>
          <Grid.Column style={{
            paddingRight: '10px'
          }}>
            <SemanticHeader as='h2'>
              <Icon name='music' size='tiny' /> Setlistify
            </SemanticHeader>
          </Grid.Column>
        </Menu.Item>
      </Container>
    </Menu>
  </Segment>
);

export default BasicHeader;