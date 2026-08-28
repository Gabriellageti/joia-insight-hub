import { describe, expect, it } from "vitest";
import { ALL_FILTER_VALUE, normalizeDiagnosticFilter } from "@/lib/select-values";

describe("filtros de diagnóstico", () => {
  it("converte a sentinela Todos para ausência de filtro", () => {
    expect(normalizeDiagnosticFilter(ALL_FILTER_VALUE)).toBe("");
    expect(normalizeDiagnosticFilter("completed")).toBe("completed");
  });
});
