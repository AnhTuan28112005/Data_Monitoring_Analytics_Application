"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/stores/themeStore";

export function ThemeInitializer() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === "light") {
      htmlElement.classList.remove("dark");
      htmlElement.classList.add("light");
    } else {
      htmlElement.classList.remove("light");
      htmlElement.classList.add("dark");
    }
  }, [theme]);

  // Apply theme on mount
  useEffect(() => {
    const htmlElement = document.documentElement;
    const storedTheme = useThemeStore.getState().theme;
    if (storedTheme === "light") {
      htmlElement.classList.remove("dark");
      htmlElement.classList.add("light");
    } else {
      htmlElement.classList.add("dark");
      htmlElement.classList.remove("light");
    }
  }, []);

  return null;
}
