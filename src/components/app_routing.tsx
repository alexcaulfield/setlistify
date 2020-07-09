import React, {useEffect, useState} from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import NotFound from "./not_found";
import Login from "./login";
import LoadingPlaceholder from "./loading_placeholder";
import LoginHandler from "./login_handler";
import CreatePlaylistContainer from "./create_playlist_container";
import {fetchUrl} from "../utils/dev_env";

export interface ImageType {
  height: number,
  width: number,
  url: string,
}

export interface UserType {
  display_name: string,
  external_urls: {
    spotify: string
  },
  followers: {
    href: string | null,
    total: number,
  },
  href: string,
  id: string,
  images: [ImageType],
  type: string,
  uri: string,
}

interface AppRoutingProps {
  user: UserType | {},
  setUser: (UserType) => void,
  isLoggedIn: boolean,
  setIsLoggedIn: (boolean) => void,
}

const AppRouting = ({user, setUser, isLoggedIn, setIsLoggedIn}: AppRoutingProps) => {
  const [authUrl, setAuthUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    fetch(`${fetchUrl()}/authUrl`)
      .then(response => response.json())
      .then(({authUrl}) => {
        if (authUrl) {
          setAuthUrl(authUrl);
          setIsLoading(false);
        }
      })
  }, []);

  return (
    <Switch>
      <Route
        exact
        path='/'
        render={() =>
          isLoggedIn ? (
            <></>
          ) : (
            isLoading ? <LoadingPlaceholder /> : <Login authUrl={authUrl} />
          )
        }
      />
      <Route
        path='/callback'
        render={() => 
          !isLoggedIn ? (
            <LoginHandler
              handleLogin={() => setIsLoggedIn(true)}
              setUser={setUser}
              setToken={setToken}
            />
          ) : (
            <Redirect to='/createPlaylist' />
          )
        }
      />
      <Route
        exact
        path='/createPlaylist'
        render={() =>
          isLoggedIn ? (
            <CreatePlaylistContainer token={token}/>
          ) : (
            <Redirect to='/'/>
          )
        }
      />
      <Route component={NotFound}/>
    </Switch>
  )
};

export default AppRouting;

