import { describe, expect, test } from "bun:test";
import { getInstallPlatform, isInstallDismissalActive, isIosUserAgent, isStandaloneDisplay } from "./pwa";

describe("PWA install helpers", () => {
  test("detecta iPhone e iPad sem confundir Android", () => {
    expect(isIosUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
    expect(isIosUserAgent("Mozilla/5.0 (Linux; Android 15; Pixel 9)")).toBe(false);
  });

  test("considera os dois modos de execução standalone", () => {
    expect(isStandaloneDisplay(true, false)).toBe(true);
    expect(isStandaloneDisplay(false, true)).toBe(true);
    expect(isStandaloneDisplay(false, false)).toBe(false);
  });

  test("prioriza o prompt nativo e orienta instalação no iOS", () => {
    expect(getInstallPlatform({ userAgent: "Android", hasNativePrompt: true, standalone: false })).toBe("native-prompt");
    expect(getInstallPlatform({ userAgent: "iPhone", hasNativePrompt: false, standalone: false })).toBe("ios");
    expect(getInstallPlatform({ userAgent: "iPhone", hasNativePrompt: true, standalone: true })).toBe("unsupported");
  });

  test("mantém o lembrete dispensado por sete dias", () => {
    const now = Date.UTC(2026, 7, 28);
    expect(isInstallDismissalActive(String(now - 6 * 24 * 60 * 60 * 1000), now)).toBe(true);
    expect(isInstallDismissalActive(String(now - 8 * 24 * 60 * 60 * 1000), now)).toBe(false);
    expect(isInstallDismissalActive("inválido", now)).toBe(false);
  });
});
