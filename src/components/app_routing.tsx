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

interface UserType {
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
}

const AppRouting = ({user, setUser}: AppRoutingProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${fetchUrl()}/authUrl`)
      .then(response => response.json())
      .then( ({authUrl}) => {
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
            />
          ) : (
            <Redirect to='/createPlaylist' />
          )
        }
      />
      <Route exact path='/createPlaylist'>
        <CreatePlaylistContainer user={user}/>
      </Route>
      <Route component={NotFound}/>
    </Switch>
  )
};

export default AppRouting;

