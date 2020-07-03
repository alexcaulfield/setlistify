import React from 'react';
import { Button, Icon } from 'semantic-ui-react';
import {Image} from 'semantic-ui-react';
import Logo from '../img/logo.png';

interface LoginProps {
  authUrl: string,
}
const Login = ({authUrl}: LoginProps) => (
  <>
    <Image src={Logo} size='huge' centered/>
    <a href={authUrl}>
      <Button>
        <Icon name='spotify' />
        Login with Spotify
      </Button>
    </a>
  </>
);

export default Login