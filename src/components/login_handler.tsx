import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import LoadingPlaceholder from './loading_placeholder';
import ErrorMessage from './error_message';
import { exchangeCodeForUser } from '../api/setlistify';
import type { SpotifyPrivateUser } from '../api/types.gen';

interface LoginHandlerProps {
  handleLogin: () => void;
  setUser: (user: SpotifyPrivateUser) => void;
  setToken: (token: string) => void;
}

const LoginHandler = ({ handleLogin, setUser, setToken }: LoginHandlerProps) => {
  const code = new URLSearchParams(window.location.search).get('code') || '';

  const { data, isError, error } = useQuery({
    queryKey: ['getUser', code],
    queryFn: () => exchangeCodeForUser({ code }),
    enabled: Boolean(code),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (data?.token && data?.user) {
      setToken(data.token);
      setUser(data.user);
      handleLogin();
    }
  }, [data, handleLogin, setToken, setUser]);

  if (isError) {
    return (
      <ErrorMessage
        header="Authentication Failed"
        message={
          <p>
            {error instanceof Error ? error.message : 'Could not authenticate with Spotify.'}{' '}
            Please <a href="/" className="underline">try logging in again</a>.
          </p>
        }
      />
    );
  }

  return <LoadingPlaceholder />;
};

export default LoginHandler;
