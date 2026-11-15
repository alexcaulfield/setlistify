import React from 'react';
import { Music } from 'lucide-react';
import type { SpotifyImage, SpotifyPrivateUser } from '../api/types.gen';

export interface HeaderProps {
  name?: string;
  user?: SpotifyPrivateUser | null;
  userImage?: string;
  setUser?: (user: any) => void;
  setIsLoggedIn?: (loggedIn: boolean) => void;
}

export const getSmallestImageUrl = (images?: SpotifyImage[]): string | undefined => {
  if (!images || !Array.isArray(images) || images.length === 0) return undefined;
  if (images.length === 1) return images[0]?.url;

  const smallest = images.reduce((minImg, currentImg) => {
    const minDim =
      (minImg.width && minImg.width > 0 ? minImg.width : null) ??
      (minImg.height && minImg.height > 0 ? minImg.height : null) ??
      Infinity;
    const currentDim =
      (currentImg.width && currentImg.width > 0 ? currentImg.width : null) ??
      (currentImg.height && currentImg.height > 0 ? currentImg.height : null) ??
      Infinity;

    if (currentDim < minDim) {
      return currentImg;
    }
    return minImg;
  }, images[images.length - 1]);

  return smallest?.url;
};

const NavBar = ({ name, user, userImage }: HeaderProps) => {
  const displayName = name ?? user?.display_name ?? user?.id ?? '';
  const userImageUrl = userImage || getSmallestImageUrl(user?.images);

  return (
    <header>
      <div className="relative flex items-center justify-center border border-gray-200 bg-white p-6 shadow-sm">
        {displayName ? (
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            {displayName}
          </h1>
        ) : (
          <Music className="h-8 w-8 text-emerald-600" aria-label="Setlistify music icon" />
        )}
        {userImageUrl && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <img
              src={userImageUrl}
              alt={displayName ? `${displayName}'s profile` : 'User profile'}
              className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm"
            />
          </div>
        )}
      </div>
    </header>
  );
};

export default NavBar;
