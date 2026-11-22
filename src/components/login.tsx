import React from 'react';
import Logo from '../img/logo.png';
import { SpotifyIcon } from './spotify_icon';

interface LoginProps {
  authUrl: string;
}

const Login = ({ authUrl }: LoginProps) => (
  <div className="flex flex-col items-center justify-center space-y-6 px-4 py-8">
    <div className="dark:rounded-2xl dark:bg-neutral-100 dark:p-4 dark:shadow-lg dark:ring-1 dark:ring-white/10">
      <img
        src={Logo}
        alt="Setlistify Logo"
        className="max-h-64 max-w-xs object-contain"
      />
    </div>
    <a
      href={authUrl}
      className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-6 py-3 font-semibold text-white shadow-md transition hover:bg-[#1ed760] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DB954]"
    >
      <SpotifyIcon />
      <span>Login with Spotify</span>
    </a>
  </div>
);

export default Login;
