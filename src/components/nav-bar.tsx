import React, { useId, useEffect, useRef } from "react";
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

  const popoverId = useId().replace(/:/g, "-") + "user-menu";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position the popover below the trigger when anchor positioning isn't supported
  useEffect(() => {
    if (!triggerRef.current || !popoverRef.current) return;
    const supported = CSS.supports("position-area: block-end");
    if (supported) return;

    const popover = popoverRef.current;
    const trigger = triggerRef.current;

    const position = () => {
      const rect = trigger.getBoundingClientRect();
      popover.style.position = "fixed";
      popover.style.inset = "auto";
      popover.style.margin = "0";
      popover.style.top = `${rect.bottom + 8}px`;
      // Align right edge of popover to right edge of trigger
      const popoverWidth = popover.offsetWidth || 160;
      const right = window.innerWidth - rect.right;
      popover.style.right = `${right}px`;
      popover.style.left = "auto";
    };

    const handleToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "open") position();
    };

    popover.addEventListener("toggle", handleToggle);
    return () => popover.removeEventListener("toggle", handleToggle);
  }, []);

  const isLoggedIn = Boolean(displayName || userImageUrl);

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 shadow-sm">
      <Music
        className="h-8 w-8 text-emerald-600"
        aria-label="Setlistify music icon"
      />

      {isLoggedIn && onLogout ? (
        <>
          {/* Trigger button */}
          <button
            ref={triggerRef}
            type="button"
            id={`${popoverId}-trigger`}
            {...({ popoverTarget: popoverId } as any)}
            aria-label="Account menu"
            className="flex items-center gap-3 rounded-full cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
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
            ) : (
              <div className="h-8 w-8 rounded-full bg-emerald-100 border border-gray-200 shadow-sm flex items-center justify-center">
                <span className="text-sm font-bold text-emerald-700">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </button>

          {/* Dropdown popover */}
          <div
            ref={popoverRef}
            id={popoverId}
            {...({ popover: "auto" } as any)}
            className="user-menu-popover"
            style={{ margin: 0 }}
          >
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  (popoverRef.current as any)?.hidePopover?.();
                  onLogout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </div>

          <style>{`
            .user-menu-popover {
              border: 1px solid #e5e7eb;
              border-radius: 0.5rem;
              background: white;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);
              min-width: 10rem;
              padding: 0;
              inset: auto;
            }

            /* Anchor positioning: below and right-aligned to trigger */
            @supports (position-area: block-end) {
              .user-menu-popover {
                position-area: block-end span-inline-start;
                position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
                inset: auto;
                margin: 0.5rem 0 0 0;
              }
            }

            /* Open/close animation */
            @media (prefers-reduced-motion: no-preference) {
              .user-menu-popover {
                opacity: 0;
                translate: 0 -.25rem;
                transition: opacity .15s, translate .15s, display .15s, overlay .15s;
                transition-behavior: allow-discrete;
              }
              .user-menu-popover:is(:popover-open, .\\:popover-open) {
                opacity: 1;
                translate: 0 0;
                transition-duration: .1s;
              }
              @starting-style {
                .user-menu-popover:is(:popover-open, .\\:popover-open) {
                  opacity: 0;
                  translate: 0 -.25rem;
                }
              }
            }
          `}</style>
        </>
      ) : isLoggedIn ? (
        /* Logged in but no onLogout (e.g. in tests) — static display */
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
