import React, { useId, useEffect, useRef } from "react";
import { Moon } from "lucide-react";
import { useTheme } from "../utils/theme";
import "./user-menu-popover.css";

export interface UserMenuPopoverProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const UserMenuPopover = ({ children, onLogout }: UserMenuPopoverProps) => {
  const popoverId = useId().replace(/:/g, "-") + "user-menu";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { isDark, toggleTheme } = useTheme();

  // Supply trigger coordinates via CSS variables when anchor positioning isn't supported
  useEffect(() => {
    if (!triggerRef.current || !popoverRef.current) return;
    if (CSS.supports("position-area: block-end")) return;

    const popover = popoverRef.current;
    const trigger = triggerRef.current;

    const position = () => {
      const rect = trigger.getBoundingClientRect();
      popover.style.setProperty("--popover-top", `${rect.bottom + 8}px`);
      popover.style.setProperty(
        "--popover-right",
        `${window.innerWidth - rect.right}px`,
      );
    };

    const handleToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "open") position();
    };

    popover.addEventListener("toggle", handleToggle);
    return () => popover.removeEventListener("toggle", handleToggle);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={`${popoverId}-trigger`}
        {...({ popoverTarget: popoverId } as any)}
        aria-label="Account menu"
        className="flex items-center gap-3 rounded-full cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:focus-visible:outline-emerald-400"
      >
        {children}
      </button>

      <div
        ref={popoverRef}
        id={popoverId}
        {...({ popover: "auto" } as any)}
        className="user-menu-popover"
      >
        <div className="py-1">
          <label className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer select-none">
            <span className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-gray-500 dark:text-neutral-400" aria-hidden="true" />
              <span>Dark mode</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Dark mode"
              checked={isDark}
              onChange={toggleTheme}
              className="theme-switch"
            />
          </label>
          <div className="my-1 border-t border-gray-100 dark:border-neutral-800" />
          <button
            type="button"
            onClick={() => {
              (popoverRef.current as any)?.hidePopover?.();
              onLogout?.();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    </>
  );
};

export default UserMenuPopover;
