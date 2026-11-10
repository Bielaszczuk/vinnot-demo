import { useRef, useState, type KeyboardEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { MoreHorizontal } from "lucide-react";

export interface CommunityMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

const NAVIGATION_KEYS = ["ArrowDown", "ArrowUp", "Home", "End"];

/** Three-dot overflow menu: keeps secondary actions out of the content until asked for. */
export function CommunityActionsMenu({
  label,
  items,
  disabled = false,
}: {
  label: string;
  items: CommunityMenuItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!NAVIGATION_KEYS.includes(event.key)) return;
    event.preventDefault();
    const options = [
      ...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ];
    const current = options.indexOf(document.activeElement as HTMLElement);
    const last = options.length - 1;
    const next = {
      ArrowDown: current >= last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key as "ArrowDown" | "ArrowUp" | "Home" | "End"];
    options[next]?.focus();
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          className="-mr-1 -mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-wine-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="menu"
          aria-label={label}
          align="end"
          sideOffset={4}
          onKeyDown={moveFocus}
          className="z-50 min-w-44 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`block min-h-10 w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                item.danger ? "text-danger" : "text-gray-700"
              }`}
              onClick={() => {
                setOpen(false);
                // Return focus to the trigger first so a dialog opened next restores it on close.
                triggerRef.current?.focus();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
