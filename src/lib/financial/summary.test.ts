import { describe, expect, test } from "bun:test";
import { calculateFinancialSummary, type FinancialSummaryRecord } from "./summary";

describe("calculateFinancialSummary", () => {
  test("recupera a receber de todos os meses e calcula os cartões do mês", () => {
    const records: FinancialSummaryRecord[] = [
      { type: "receita", amount: 1_000, date: "2026-07-10", status: "Pago", paidAt: "2026-07-10" },
      { type: "receita", amount: 600, date: "2026-07-30", status: "Pendente" },
      { type: "receita", amount: 400, date: "2026-06-20", status: "Vencido" },
      { type: "despesa", amount: 250, date: "2026-07-12", status: "Pago" },
      { type: "despesa", amount: 100, date: "2026-06-12", status: "Pago" },
    ];

    expect(calculateFinancialSummary(records, new Date(2026, 6, 25))).toEqual({
      totalRevenue: 1_600,
      totalExpenses: 250,
      pendingCount: 2,
      overdueCount: 1,
      pendingAmount: 1_000,
      cashBalance: 650,
      margin: 84.375,
    });
  });

  test("considera pendência vencida pela data mesmo com status Pendente", () => {
    const summary = calculateFinancialSummary(
      [{ type: "receita", amount: 200, date: "2026-07-01", status: "Pendente" }],
      new Date(2026, 6, 25),
    );

    expect(summary).toMatchObject({ pendingCount: 1, overdueCount: 1, pendingAmount: 200 });
  });
});
