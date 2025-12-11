// ============================================
// FILE: app/components/theme-toggle.tsx (HYDRATION-SAFE)
// ============================================
import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get initial theme
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme || systemTheme;
    
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-9 h-9 p-0"
        disabled
      >
        <div className="w-[18px] h-[18px]" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 p-0"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <IconMoon size={18} className="text-muted-foreground" />
      ) : (
        <IconSun size={18} className="text-muted-foreground" />
      )}
    </Button>
  );
}