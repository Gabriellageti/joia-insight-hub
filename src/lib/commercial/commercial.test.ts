import { describe, expect, test } from "bun:test";
import { calculateCommercialMetrics } from "./commercial";

describe("commercial metrics", () => {
  test("calculates only useful pipeline and decision metrics", () => {
    const metrics = calculateCommercialMetrics([
      { stage: "new_lead", value: 1000, source: "Indicação" },
      { stage: "proposal", value: 2000, source: "Site" },
      { stage: "won", value: 3000, source: "Indicação" },
      { stage: "lost", value: 4000, source: null },
    ], [{ status: "sent" }, { status: "accepted" }]);
    expect(metrics.openCount).toBe(2);
    expect(metrics.pipelineValue).toBe(3000);
    expect(metrics.openProposals).toBe(1);
    expect(metrics.conversionRate).toBe(50);
    expect(metrics.sources[0]).toEqual(["Indicação", 2]);
  });
});
