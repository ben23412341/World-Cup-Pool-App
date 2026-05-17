import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl text-text">Page not found</h1>
      <p className="mt-4 max-w-sm text-base text-text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-primary px-6 py-3 text-base font-medium text-text transition-colors hover:bg-primary-bright"
      >
        Go home
      </Link>
    </div>
  );
}
