import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = activeTheme === "dark";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Sun className={cn("h-4 w-4 text-muted-foreground", !isDark && "text-foreground")} />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Alternar tema"
      />
      <Moon className={cn("h-4 w-4 text-muted-foreground", isDark && "text-foreground")} />
    </div>
  );
};

export { ThemeToggle };
