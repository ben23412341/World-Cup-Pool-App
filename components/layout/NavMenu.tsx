"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const NAV_LINKS = [
  { href: "/my-entries", label: "My entries" },
  { href: "/join", label: "Join pool" },
];

export function NavMenu({ signOut }: { signOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden items-center gap-2 md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
          >
            {link.label}
          </Link>
        ))}
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Mobile dropdown */}
      <div className="relative md:hidden" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-md border border-border bg-surface shadow-lg">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border">
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
