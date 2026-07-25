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
      payableAmount: 0,
      payableCount: 0,
      projectedBalance: 1_650,
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

  test("separa contas a pagar do caixa realizado e calcula o saldo projetado", () => {
    const summary = calculateFinancialSummary([
      { type: "receita", amount: 1_000, date: "2026-07-10", status: "Pago" },
      { type: "receita", amount: 500, date: "2026-08-10", status: "Pendente" },
      { type: "despesa", amount: 200, date: "2026-07-12", status: "Pago" },
      { type: "despesa", amount: 300, date: "2026-08-12", status: "Pendente" },
    ], new Date(2026, 6, 25));

    expect(summary).toMatchObject({
      cashBalance: 800,
      payableAmount: 300,
      payableCount: 1,
      projectedBalance: 1_000,
    });
  });
});
