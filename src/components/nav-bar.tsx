import React from "react";
import { Music } from "lucide-react";
import type { SpotifyPrivateUser } from "../api/types.gen";
import { getSmallestImageUrl } from "../utils/image-utils";

export { getSmallestImageUrl };

export interface HeaderProps {
  name?: string;
  user?: SpotifyPrivateUser | null;
  userImage?: string;
  setUser?: (user: any) => void;
  setIsLoggedIn?: (loggedIn: boolean) => void;
  onLogout?: () => void;
}

const NavBar = ({ name, user, userImage, onLogout }: HeaderProps) => {
  const displayName = name ?? user?.display_name ?? user?.id ?? "";
  const userImageUrl = userImage || getSmallestImageUrl(user?.images);

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 shadow-sm">
      <Music
        className="h-8 w-8 text-emerald-600"
        aria-label="Setlistify music icon"
      />
      {(displayName || userImageUrl) ? (
        <div className="flex items-center gap-4">
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
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="text-sm font-medium text-gray-500 transition hover:text-gray-900 cursor-pointer"
            >
              Log out
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
};

export default NavBar;
