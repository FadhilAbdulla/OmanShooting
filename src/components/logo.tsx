export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  // Stylised target with crossed rifles motif
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#c8102e" />
      <circle cx="20" cy="20" r="12.5" fill="none" stroke="#f4ede0" strokeWidth="2" />
      <circle cx="20" cy="20" r="7" fill="none" stroke="#f4ede0" strokeWidth="2" />
      <circle cx="20" cy="20" r="2.5" fill="#f4ede0" />
      <path d="M6 34 L34 6 M6 6 L34 34" stroke="#d6c19b" strokeWidth="1.5" opacity=".7" />
    </svg>
  );
}
