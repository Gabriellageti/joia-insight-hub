import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { RefreshCw, Share2, Smartphone, WifiOff, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getInstallPlatform,
  INSTALL_DISMISSAL_KEY,
  isInstallDismissalActive,
  isStandaloneDisplay,
} from "@/lib/pwa";
import { PwaInstallContext, type PwaInstallContextValue } from "@/contexts/PwaInstallContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function readDismissal() {
  try {
    return isInstallDismissalActive(window.localStorage.getItem(INSTALL_DISMISSAL_KEY));
  } catch {
    return false;
  }
}

function writeDismissal() {
  try {
    window.localStorage.setItem(INSTALL_DISMISSAL_KEY, String(Date.now()));
  } catch {
    // Installation remains available from the header when storage is unavailable.
  }
}

function getStandaloneState() {
  const navigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return isStandaloneDisplay(window.matchMedia("(display-mode: standalone)").matches, navigatorStandalone);
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(getStandaloneState);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installDismissed, setInstallDismissed] = useState(readDismissal);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error("Falha ao registrar recursos offline do JoIA Ops", { name: error.name });
    },
  });

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      toast.success("JoIA Ops instalado com sucesso");
    };
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const handleDisplayMode = () => setInstalled(getStandaloneState());

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    displayMode.addEventListener("change", handleDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      displayMode.removeEventListener("change", handleDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (!offlineReady) return;
    toast.success("JoIA Ops pronto para abrir mesmo sem conexão");
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  const platform = getInstallPlatform({
    userAgent: navigator.userAgent,
    hasNativePrompt: deferredPrompt !== null,
    standalone: installed,
  });
  const canInstall = platform !== "unsupported";

  const install = useCallback(async () => {
    if (platform === "ios") {
      setInstructionsOpen(true);
      return;
    }
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "dismissed") {
      writeDismissal();
      setInstallDismissed(true);
    }
  }, [deferredPrompt, platform]);

  const dismissInstall = useCallback(() => {
    writeDismissal();
    setInstallDismissed(true);
  }, []);

  const contextValue = useMemo<PwaInstallContextValue>(() => ({
    canInstall,
    installed,
    platform,
    install,
  }), [canInstall, install, installed, platform]);

  return (
    <PwaInstallContext.Provider value={contextValue}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" aria-live="polite">
        {!online ? (
          <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg" role="status">
            <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p><strong>Sem conexão.</strong> A interface continua disponível; os dados serão carregados quando a internet voltar.</p>
          </div>
        ) : null}

        {needRefresh ? (
          <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg" role="status">
            <RefreshCw className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm"><strong>Nova versão disponível.</strong> Atualize para receber as melhorias.</p>
            <Button size="sm" onClick={() => void updateServiceWorker(true)}>Atualizar</Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Fechar aviso de atualização" onClick={() => setNeedRefresh(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {canInstall && !installDismissed && online && !needRefresh ? (
          <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg" role="status">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Instale o JoIA Ops</p>
              <p className="text-xs text-muted-foreground">Abra em tela cheia e acesse pelo ícone do celular.</p>
            </div>
            <Button size="sm" onClick={() => void install()}>Instalar</Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Lembrar de instalar depois" onClick={dismissInstall}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar o JoIA Ops no iPhone</DialogTitle>
            <DialogDescription>Use o Safari para adicionar o app à Tela de Início.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">1</span>
              <p className="pt-1">Abra esta página no <strong>Safari</strong>.</p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">2</span>
              <p className="flex items-center gap-1 pt-1">Toque em <Share2 className="inline h-4 w-4" aria-label="Compartilhar" /> <strong>Compartilhar</strong>.</p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">3</span>
              <p className="pt-1">Escolha <strong>Adicionar à Tela de Início</strong>, ative <strong>Abrir como App</strong> e toque em Adicionar.</p>
            </li>
          </ol>
          <Button className="w-full" onClick={() => setInstructionsOpen(false)}>Entendi</Button>
        </DialogContent>
      </Dialog>
    </PwaInstallContext.Provider>
  );
}
