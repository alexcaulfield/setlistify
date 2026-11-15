import React from "react";
import { Music } from "lucide-react";
import type { SpotifyImage, SpotifyPrivateUser } from "../api/types.gen";

export interface HeaderProps {
  name?: string;
  user?: SpotifyPrivateUser | null;
  userImage?: string;
  setUser?: (user: any) => void;
  setIsLoggedIn?: (loggedIn: boolean) => void;
}

export const getSmallestImageUrl = (
  images?: SpotifyImage[],
): string | undefined => {
  if (!images || !Array.isArray(images) || images.length === 0)
    return undefined;
  if (images.length === 1) return images[0]?.url;

  const smallest = images.reduce(
    (minImg, currentImg) => {
      const minDim =
        (minImg.width && minImg.width > 0 ? minImg.width : null) ??
        (minImg.height && minImg.height > 0 ? minImg.height : null) ??
        Infinity;
      const currentDim =
        (currentImg.width && currentImg.width > 0 ? currentImg.width : null) ??
        (currentImg.height && currentImg.height > 0
          ? currentImg.height
          : null) ??
        Infinity;

      if (currentDim < minDim) {
        return currentImg;
      }
      return minImg;
    },
    images[images.length - 1],
  );

  return smallest?.url;
};

const NavBar = ({ name, user, userImage }: HeaderProps) => {
  const displayName = name ?? user?.display_name ?? user?.id ?? "";
  const userImageUrl = userImage || getSmallestImageUrl(user?.images);

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 shadow-sm">
      <Music
        className="h-8 w-8 text-emerald-600"
        aria-label="Setlistify music icon"
      />
      {(displayName || userImageUrl) ? (
        <div className="flex items-center gap-3">
          {displayName ? (
            <span className="text-base font-semibold tracking-tight text-gray-900">
              {displayName}
            </span>
          ) : null}
          {userImageUrl ? (
            <img
              src={userImageUrl}
              alt={displayName ? `${displayName}'s profile` : "User profile"}
              className="h-8 w-8 rounded-full object-cover border border-gray-200 shadow-sm"
            />
          ) : null}
        </div>
      ) : null}
    </header>
  );
};

export default NavBar;
