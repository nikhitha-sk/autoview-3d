"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "./ui/Logo";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/#showroom", label: "Showroom", match: "/car" },
  { href: "/upload", label: "Photo to 3D", match: "/upload" },
  { href: "/about", label: "How it works", match: "/about" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // close the mobile menu on navigation
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,border-color] duration-500 ${
        solid ? "border-b border-line bg-bg/75 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-8">
        <Link href="/" aria-label="AutoView 3D home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  active ? "text-text" : "text-muted hover:text-text"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-4 -bottom-px h-px origin-left bg-accent transition-transform duration-500 ease-out-expo ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/upload"
            className="hidden items-center gap-1.5 rounded-full bg-text px-4 py-2 text-[12px] font-semibold text-bg transition hover:bg-accent hover:text-accent-ink sm:inline-flex"
          >
            Generate 3D <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-line md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line px-4 pb-6 pt-2 md:hidden" aria-label="Mobile">
          {NAV.map((item, i) => (
            <Link key={item.href} href={item.href} className="flex items-baseline gap-4 border-b border-line py-4">
              <span className="font-mono text-[11px] text-faint">0{i + 1}</span>
              <span className="font-display text-lg font-semibold">{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
