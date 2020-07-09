import React from 'react';
import {Card, Icon, Container, Button} from "semantic-ui-react";
import {useHistory} from "react-router-dom";
import {fetchUrl} from "../utils/dev_env";

interface HeaderProps {
  name: string,
  setUser: ({display_name, id}) => void,
  setIsLoggedIn: (boolean) => void,
}

const HeaderCard = ({name, setUser, setIsLoggedIn}: HeaderProps) => {
  let history = useHistory();

  const handleLogout = () => {
    fetch(`${fetchUrl()}/logout`, {
      method: 'get',
      credentials: 'include',
    })
      .then(res => res.json())
      .then((data) => {
        setUser(data);
        setIsLoggedIn(false);
        history.push('/');
      })
  };
  return (
    <Container>
      <Card fluid centered>
        <Card.Content>
          {!!name ? (
            <>
              <Card.Header>{name}</Card.Header>
              {/*<Button circular icon='log out' onClick={handleLogout} />*/}
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

