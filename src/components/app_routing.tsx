import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRouteWithContext,
  RouterProvider,
  Navigate,
  Outlet,
} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import NotFound from './not_found';
import Login from './login';
import LoadingPlaceholder from './loading_placeholder';
import LoginHandler from './login_handler';
import CreatePlaylistContainer from './create_playlist_container';
import { fetchAuthUrl } from '../api/setlistify';
import type { SpotifyPrivateUser } from '../api/types.gen';

export interface RouterContext {
  user: SpotifyPrivateUser | null;
  setUser: (user: SpotifyPrivateUser) => void;
  token: string;
  setToken: (token: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

function IndexPage() {
  const { isLoggedIn } = indexRoute.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ['authUrl'],
    queryFn: fetchAuthUrl,
    staleTime: 1000 * 60 * 30,
  });

  if (isLoggedIn) {
    return null;
  }

  if (isLoading) {
    return <LoadingPlaceholder />;
  }

  return <Login authUrl={data?.authUrl ?? ''} />;
}

interface CallbackSearchParams {
  code?: string;
}

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/callback',
  validateSearch: (search: Record<string, unknown>): CallbackSearchParams => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const { isLoggedIn, setIsLoggedIn, setUser, setToken } = callbackRoute.useRouteContext();

  if (isLoggedIn) {
    return <Navigate to="/createPlaylist" />;
  }

  return (
    <LoginHandler
      handleLogin={() => setIsLoggedIn(true)}
      setUser={setUser}
      setToken={setToken}
    />
  );
}

const createPlaylistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/createPlaylist',
  component: CreatePlaylistPage,
});

function CreatePlaylistPage() {
  const { isLoggedIn, token } = createPlaylistRoute.useRouteContext();

  if (!isLoggedIn) {
    return <Navigate to="/" />;
  }

  return <CreatePlaylistContainer token={token} />;
}

const routeTree = rootRoute.addChildren([indexRoute, callbackRoute, createPlaylistRoute]);

export const router = createRouter({
  routeTree,
  context: undefined!, // Provided via RouterProvider context prop
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

interface AppRoutingProps {
  user: SpotifyPrivateUser | null;
  setUser: (user: SpotifyPrivateUser) => void;
  token: string;
  setToken: (token: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
}

const AppRouting = ({
  user,
  setUser,
  token,
  setToken,
  isLoggedIn,
  setIsLoggedIn,
}: AppRoutingProps) => {
  return (
    <RouterProvider
      router={router}
      context={{
        user,
        setUser,
        token,
        setToken,
        isLoggedIn,
        setIsLoggedIn,
      }}
    />
  );
};

export default AppRouting;
