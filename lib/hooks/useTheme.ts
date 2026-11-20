"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

function read(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

/** Theme lives on <html data-theme>, set before paint by an inline script. */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, read, () => "dark");
  const setTheme = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("av-theme", t);
    } catch {}
  }, []);
  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
