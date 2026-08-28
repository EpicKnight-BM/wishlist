"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconSun, IconMoon } from "@tabler/icons-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private mode, etc.) — theme just won't persist
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <IconSun /> : <IconMoon />}
    </Button>
  );
}
