"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/hooks/useTheme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to daylight studio" : "Switch to night showroom"}
      title={dark ? "Daylight studio" : "Night showroom"}
      className={`grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-text ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
