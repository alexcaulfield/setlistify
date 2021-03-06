import React, {useEffect} from 'react';
import LoadingPlaceholder from "./loading_placeholder";
import {fetchUrl} from "../utils/dev_env";

interface LoginHandlerProps {
  handleLogin: () => void,
  setUser: (object) => void,
  setToken: (string) => void,
  cachePath: string,
}

const getUrlParams = () => {
  const vars = {code: ''};
  window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (substring, key, value) => {
    vars[key] = value;
    return vars.toString();
  });
  return vars;
};

const LoginHandler = ({handleLogin, setUser, setToken, cachePath}: LoginHandlerProps) => {
  useEffect(() => {
    const params = getUrlParams();
    if (params?.code) {
      const body = JSON.stringify({
        code: params.code,
        cache_path: cachePath,
      });
      fetch(`${fetchUrl()}/getUser`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: body
      }).then(res => res.json())
        .then(({user, token}) => {
          setToken(token);
          setUser(user);
          handleLogin();
        });
    }
  }, [cachePath]);

  return (
    <>
      <LoadingPlaceholder />
    </>
  )
};

export default LoginHandler;
