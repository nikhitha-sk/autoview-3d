export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  // Orbit ring around an abstract wedge silhouette: "a car you can walk around"
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <ellipse cx="16" cy="19" rx="14" ry="5.2" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.2" />
      <path d="M4.5 18.5c2.6-.2 4.2-1 6.2-3.3 1.5-1.7 3-2.5 5.4-2.5 3.4 0 5.6 1.4 7.8 3.6l3.6.6c.9.2 1.4.8 1.4 1.6H4.5Z" fill="currentColor" />
      <path d="M27.4 17.7A14 5.2 0 0 1 16 24.2" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="24.2" r="1.4" fill="var(--accent)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="h-7 w-7 text-text" />
      <span className="font-display text-[13px] font-bold tracking-[0.08em]">
        AutoView<span className="ml-1 font-mono text-[11px] font-medium text-accent">3D</span>
      </span>
    </span>
  );
}
