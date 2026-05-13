"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/lib/stores/themeStore";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    toggleTheme();
    const newTheme = theme === "dark" ? "light" : "dark";
    const htmlElement = document.documentElement;

    if (newTheme === "light") {
      htmlElement.classList.remove("dark");
      htmlElement.classList.add("light");
    } else {
      htmlElement.classList.remove("light");
      htmlElement.classList.add("dark");
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg bg-bg-elev/60 border border-line/40 hover:bg-bg-elev transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-accent-yellow" />
      ) : (
        <Moon className="w-4 h-4 text-accent-cyan" />
      )}
    </button>
  );
}
