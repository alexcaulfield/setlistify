import React, { useId, useEffect, useRef } from "react";
import "./user-menu-popover.css";

export interface UserMenuPopoverProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const UserMenuPopover = ({ children, onLogout }: UserMenuPopoverProps) => {
  const popoverId = useId().replace(/:/g, "-") + "user-menu";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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
        className="flex items-center gap-3 rounded-full cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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
          <button
            type="button"
            onClick={() => {
              (popoverRef.current as any)?.hidePopover?.();
              onLogout?.();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    </>
  );
};

export default UserMenuPopover;
