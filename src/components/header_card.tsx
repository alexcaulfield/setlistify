import React from 'react';
import { Music } from 'lucide-react';

interface HeaderProps {
  name: string;
  setUser?: (user: any) => void;
  setIsLoggedIn?: (loggedIn: boolean) => void;
}

const HeaderCard = ({ name }: HeaderProps) => {
  return (
    <header className="mx-auto max-w-md px-4">
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {name ? (
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            {name}
          </h1>
        ) : (
          <Music className="h-8 w-8 text-emerald-600" aria-label="Setlistify music icon" />
        )}
      </div>
    </header>
  );
};

export default HeaderCard;
