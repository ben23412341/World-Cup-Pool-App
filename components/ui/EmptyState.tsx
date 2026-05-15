import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant: "primary" | "ghost";
  disabled?: boolean;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  children?: ReactNode;
};

const primaryClass =
  "rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-bright disabled:cursor-not-allowed disabled:opacity-50";
const ghostClass =
  "rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text disabled:cursor-not-allowed disabled:opacity-50";

export function EmptyState({ title, description, actions, children }: EmptyStateProps) {
  return (
    <div className="mx-auto max-w-[500px] rounded-lg border border-border bg-surface px-6 py-12 text-center">
      <h2 className="font-display text-xl text-text">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      )}
      {actions && actions.length > 0 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          {actions.map((action) => {
            const cls = action.variant === "primary" ? primaryClass : ghostClass;
            if (action.href) {
              return (
                <Link key={action.label} href={action.href} className={cls}>
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                disabled={action.disabled}
                className={cls}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}
