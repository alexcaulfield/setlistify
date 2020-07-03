import React from 'react';
import {Icon, Message, Segment, Responsive} from "semantic-ui-react";

interface ErrorMessageProps {
  header: string,
  message: JSX.Element,
}

const ErrorMessage = ({header, message}: ErrorMessageProps) => (
  <Responsive as={Segment}>
    <Message icon>
      <Icon name='dont' />
      <Message.Content>
        <Message.Header>{header}</Message.Header>
        {message}
      </Message.Content>
    </Message>
  </Responsive>
);

export default ErrorMessage;