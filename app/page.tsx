export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-accent"
        aria-hidden="true"
      >
        <path d="M18 2H6v2H4v5c0 2.97 2.16 5.44 5 5.91V17H7v2h2v1H7v2h10v-2h-2v-1h2v-2h-2v-1.09c2.84-.47 5-2.94 5-5.91V4h-2V2zM6 9V6h2v4.9A4.01 4.01 0 0 1 6 9zm12 0c0 1.48-.81 2.77-2 3.46V6h2v3z" />
      </svg>
      <h1 className="font-display text-4xl tracking-tight text-text">
        World Cup Pool
      </h1>
      <p className="font-sans text-base text-text-muted">Pool app coming soon</p>
    </main>
  );
}
