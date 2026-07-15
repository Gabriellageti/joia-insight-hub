import { describe, expect, test } from "bun:test";
import { isSameTaskDay, parseTaskDate } from "./dates";

describe("datas de tarefas", () => {
  test("aceita datas ISO persistidas pelo Supabase", () => {
    expect(parseTaskDate("2026-07-14")?.getDate()).toBe(14);
  });

  test("mantém compatibilidade com datas brasileiras legadas", () => {
    expect(isSameTaskDay("14/07/2026", new Date(2026, 6, 14))).toBe(true);
  });

  test("rejeita valores inválidos", () => {
    expect(parseTaskDate("amanhã")).toBeNull();
  });
});
