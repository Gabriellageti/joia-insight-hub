import { describe, expect, it } from "vitest";
import { addBillingPeriod, buildContractInstallments } from "./contract-billing";

describe("addBillingPeriod", () => {
  it("gera vencimentos semanais a cada sete dias", () => {
    expect(addBillingPeriod("2026-09-04", 1, "semanal")).toBe("2026-09-11");
    expect(addBillingPeriod("2026-09-04", 12, "semanal")).toBe("2026-11-27");
  });

  it("mantém a geração mensal existente", () => {
    expect(addBillingPeriod("2026-09-04", 2, "mensal")).toBe("2026-11-04");
  });
});

describe("buildContractInstallments", () => {
  it("preserves installment links and payment statuses while editing", () => {
    const installments = buildContractInstallments({
      billingType: "semanal",
      totalValue: 200,
      installmentCount: 2,
      firstDueDate: "2026-08-21",
      existingInstallments: [
        { id: "linked-1", value: 80, dueDate: "2026-01-01", status: "paid" },
        { id: "linked-2", value: 80, dueDate: "2026-01-08", status: "pending" },
      ],
      createId: () => "new-id",
    });

    expect(installments).toEqual([
      { id: "linked-1", value: 100, dueDate: "2026-08-21", status: "paid" },
      { id: "linked-2", value: 100, dueDate: "2026-08-28", status: "pending" },
    ]);
  });

  it("creates ids only for newly added installments", () => {
    let nextId = 0;
    const installments = buildContractInstallments({
      billingType: "mensal",
      totalValue: 300,
      installmentCount: 3,
      firstDueDate: "2026-01-10",
      existingInstallments: [
        { id: "linked-1", value: 100, dueDate: "2026-01-10", status: "pending" },
      ],
      createId: () => `new-${++nextId}`,
    });

    expect(installments.map(({ id }) => id)).toEqual(["linked-1", "new-1", "new-2"]);
  });
});
