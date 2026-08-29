export type InstallPlatform = "ios" | "native-prompt" | "unsupported";

export const INSTALL_DISMISSAL_KEY = "joia:pwa-install-dismissed-at:v1";
export const INSTALL_DISMISSAL_DAYS = 7;

export function isIosUserAgent(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function isStandaloneDisplay(displayModeStandalone: boolean, navigatorStandalone?: boolean) {
  return displayModeStandalone || navigatorStandalone === true;
}

export function getInstallPlatform(options: {
  userAgent: string;
  hasNativePrompt: boolean;
  standalone: boolean;
}): InstallPlatform {
  if (options.standalone) return "unsupported";
  if (options.hasNativePrompt) return "native-prompt";
  if (isIosUserAgent(options.userAgent)) return "ios";
  return "unsupported";
}

export function isInstallDismissalActive(value: string | null, now = Date.now()) {
  if (!value) return false;
  const dismissedAt = Number(value);
  if (!Number.isFinite(dismissedAt)) return false;
  return now - dismissedAt < INSTALL_DISMISSAL_DAYS * 24 * 60 * 60 * 1000;
}
