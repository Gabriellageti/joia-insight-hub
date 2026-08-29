import { describe, expect, test } from "bun:test";
import {
  getPaidRecordUpdate,
  mapRecordToInsert,
  mapRecordToLegacy,
  mapRecordToUpdate,
} from "./financial-record-mappers";
import type { FinancialRecordRow } from "@/integrations/supabase/financial-records";

const databaseRecord = (overrides: Partial<FinancialRecordRow> = {}): FinancialRecordRow => ({
  id: "record-1",
  client_id: null,
  project_id: null,
  contract_id: "contract-1",
  installment_id: "installment-1",
  type: "receita",
  category: null,
  description: "Parcela",
  amount: 100,
  date: "2026-08-10",
  status: "Pago",
  paid_at: "2026-07-20",
  payment_method: "PIX",
  payment_notes: "Recebido antecipadamente",
  is_internal: false,
  created_at: "2026-07-01T12:00:00Z",
  updated_at: "2026-07-20T12:00:00Z",
  ...overrides,
});

describe("financial record payment mapping", () => {
  test.each([
    ["expense", "despesa"],
    ["despesa", "despesa"],
    ["revenue", "receita"],
    ["receita", "receita"],
  ] as const)("mantém visível o tipo histórico %s como %s", (storedType, expectedType) => {
    expect(mapRecordToLegacy(databaseRecord({ type: storedType })).type).toBe(expectedType);
  });

  test("carrega registros antigos que já possuem dados de pagamento e vínculos", () => {
    expect(mapRecordToLegacy(databaseRecord())).toMatchObject({
      paidAt: "2026-07-20",
      paymentMethod: "PIX",
      paymentNotes: "Recebido antecipadamente",
      contractId: "contract-1",
      installmentId: "installment-1",
      date: "2026-08-10",
    });
  });

  test.each(["2026-07-25", "2026-06-30"])(
    "registra pagamento hoje ou retroativo sem alterar o vencimento: %s",
    (paidAt) => {
      const update = mapRecordToUpdate(getPaidRecordUpdate({ paidAt }));
      expect(update).toMatchObject({ status: "Pago", paid_at: paidAt });
      expect(update).not.toHaveProperty("date");
    }
  );

  test("permite corrigir somente a data efetiva do pagamento", () => {
    const update = mapRecordToUpdate({ paidAt: "2026-07-18" });
    expect(update.paid_at).toBe("2026-07-18");
    expect(update).not.toHaveProperty("date");
  });

  test("preserva paid_at no banco ao editar outros campos", () => {
    const update = mapRecordToUpdate({
      description: "Parcela corrigida",
      clientId: "client-2",
      projectId: "project-2",
      amount: 120,
      date: "2026-08-15",
      status: "Pago",
    });
    expect(update).not.toHaveProperty("paid_at");
    expect(update).not.toHaveProperty("payment_method");
    expect(update).not.toHaveProperty("payment_notes");
    expect(update).toMatchObject({ description: "Parcela corrigida", amount: 120 });
  });

  test("limpa todos os detalhes ao desfazer um recebimento", () => {
    expect(mapRecordToUpdate({
      status: "Pendente",
      paidAt: "",
      paymentMethod: "",
      paymentNotes: "",
    })).toMatchObject({
      status: "Pendente",
      paid_at: null,
      payment_method: null,
      payment_notes: null,
    });
  });

  test("envia campos de pagamento e vínculos ao criar um registro", () => {
    expect(mapRecordToInsert({
      type: "receita",
      amount: 100,
      date: "2026-08-10",
      paidAt: "2026-07-25",
      paymentMethod: "PIX",
      paymentNotes: "Confirmado",
      contractId: "contract-1",
      installmentId: "installment-1",
    })).toMatchObject({
      date: "2026-08-10",
      paid_at: "2026-07-25",
      payment_method: "PIX",
      payment_notes: "Confirmado",
      contract_id: "contract-1",
      installment_id: "installment-1",
    });
  });
});
