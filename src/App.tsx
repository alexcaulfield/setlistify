import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouting from './components/app_routing';
import NavBar from './components/nav-bar';
import { getSmallestImageUrl } from './utils/image-utils';
import Footer from './components/footer';
import type { SpotifyPrivateUser } from './api/types.gen';
import {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStoredAuth,
} from './utils/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [token, setToken] = useState<string>(() => getStoredToken());
  const [user, setUser] = useState<SpotifyPrivateUser | null>(() => getStoredUser());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(getStoredToken()));

  useEffect(() => {
    setStoredToken(token);
  }, [token]);

  useEffect(() => {
    setStoredUser(user);
  }, [user]);

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setIsLoggedIn(false);
    clearStoredAuth();
  };

  const displayName = user?.display_name || user?.id || '';
  const userImage = getSmallestImageUrl(user?.images);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
        <main className="flex-1 pb-8">
          <NavBar
            name={displayName}
            user={user}
            userImage={userImage}
            setUser={setUser}
            setIsLoggedIn={setIsLoggedIn}
            onLogout={handleLogout}
          />
          <div className="mt-6">
            <AppRouting
              user={user}
              setUser={setUser}
              token={token}
              setToken={setToken}
              isLoggedIn={isLoggedIn}
              setIsLoggedIn={setIsLoggedIn}
            />
          </div>
        </main>
        <Footer />
      </div>
    </QueryClientProvider>
  );
}

export default App;
