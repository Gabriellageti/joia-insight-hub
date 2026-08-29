import { createContext, useContext } from "react";
import type { InstallPlatform } from "@/lib/pwa";

export interface PwaInstallContextValue {
  canInstall: boolean;
  installed: boolean;
  platform: InstallPlatform;
  install: () => Promise<void>;
}

export const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error("usePwaInstall must be used within PwaInstallProvider");
  return context;
}
