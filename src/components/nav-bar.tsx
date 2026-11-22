import React from "react";
import { Music } from "lucide-react";
import type { SpotifyPrivateUser } from "../api/types.gen";
import { getSmallestImageUrl } from "../utils/image-utils";
import UserMenuPopover from "./user-menu-popover";

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
  const isLoggedIn = Boolean(displayName || userImageUrl);

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <Music
        className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
        aria-label="Setlistify music icon"
      />

      {isLoggedIn ? (
        <UserMenuPopover onLogout={onLogout}>
          {displayName ? (
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-neutral-100">
              {displayName}
            </span>
          ) : null}
          {userImageUrl ? (
            <img
              src={userImageUrl}
              alt={displayName ? `${displayName}'s profile` : "User profile"}
              className="h-8 w-8 rounded-full object-cover border border-gray-200 shadow-sm dark:border-neutral-700"
            />
          ) : null}
        </UserMenuPopover>
      ) : null}
    </header>
  );
};

export default NavBar;
