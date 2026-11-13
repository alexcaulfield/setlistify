import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouting from './components/app_routing';
import HeaderCard from './components/header_card';
import Footer from './components/footer';
import type { SpotifyPrivateUser } from './api/types.gen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [user, setUser] = useState<SpotifyPrivateUser | null>(null);
  const [token, setToken] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const displayName = user?.display_name || user?.id || '';

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
        <main className="flex-1 py-8">
          <HeaderCard
            name={displayName}
            setUser={setUser}
            setIsLoggedIn={setIsLoggedIn}
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
