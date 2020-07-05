import React, {useEffect} from 'react';
import LoadingPlaceholder from "./loading_placeholder";
import {fetchUrl} from "../utils/dev_env";

interface LoginHandlerProps {
  handleLogin: () => void,
  setUser: (object) => void,
}

const getUrlParams = () => {
  const vars = {code: ''};
  window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (substring, key, value) => {
    vars[key] = value;
    return vars.toString();
  });
  return vars;
};

const LoginHandler = ({handleLogin, setUser}: LoginHandlerProps) => {
  useEffect(() => {
    const params = getUrlParams();
    if (params?.code) {
      const body = JSON.stringify({
        'code': params.code
      });
      fetch(`${fetchUrl()}/getUser`, {
        method: 'post',
        credentials: 'same-origin',
        headers: {'Content-Type':'application/json'},
        body: body
      }).then(res => res.json())
        .then(data => {
          setUser(data);
          handleLogin();
        });
    }
  }, []);

  return (
    <>
      <LoadingPlaceholder />
    </>
  )
};

export default LoginHandler;
