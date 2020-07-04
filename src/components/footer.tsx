import React from 'react';
import {Header, Icon, Segment} from "semantic-ui-react";

const Footer = () => (
  <Segment>
    <Header as='h4'>© {new Date().getFullYear()} Alex Caulfield</Header>
    <span>
      Any questions? contact Alex on <a href='https://www.linkedin.com/in/alexandercaulfield/ ' target="_blank" rel="noopener noreferrer"><Icon link name='linkedin' size='large'/></a>
    </span>
  </Segment>
);

export default Footer