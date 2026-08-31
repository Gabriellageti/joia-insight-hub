import { useEffect } from "react";

/** Layout-only metrics for dialogs when a mobile keyboard reduces the visual viewport. */
export function ViewportMetrics() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--visual-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
        document.documentElement.style.setProperty("--visual-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      });
    };
    update(); viewport?.addEventListener("resize", update); viewport?.addEventListener("scroll", update); window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame); viewport?.removeEventListener("resize", update); viewport?.removeEventListener("scroll", update); window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--visual-viewport-height"); document.documentElement.style.removeProperty("--visual-viewport-top");
    };
  }, []);
  return null;
}
