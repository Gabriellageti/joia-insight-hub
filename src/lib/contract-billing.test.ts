import { describe, expect, it } from "vitest";
import { addBillingPeriod } from "./contract-billing";

describe("addBillingPeriod", () => {
  it("gera vencimentos semanais a cada sete dias", () => {
    expect(addBillingPeriod("2026-09-04", 1, "semanal")).toBe("2026-09-11");
    expect(addBillingPeriod("2026-09-04", 12, "semanal")).toBe("2026-11-27");
  });

  it("mantém a geração mensal existente", () => {
    expect(addBillingPeriod("2026-09-04", 2, "mensal")).toBe("2026-11-04");
  });
});
