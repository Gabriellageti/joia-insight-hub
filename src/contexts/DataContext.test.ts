import { describe, expect, test } from "vitest";
import { getTemplatesSeed } from "@/lib/diagnostics";
import { syncTemplatesWithSeed } from "./templateSync";

const templatesSeed = getTemplatesSeed();

const byId = (id: string) => templatesSeed.find((template) => template.id === id)!;

const OPERACOES_SAAS_ID = "template-1";
const DIAGNOSTICO_FINANCEIRO_ID = "template-4";

describe("syncTemplatesWithSeed", () => {
  test("does not rehydrate deleted seed templates when local storage is empty", () => {
    const result = syncTemplatesWithSeed([], templatesSeed, new Set([OPERACOES_SAAS_ID, DIAGNOSTICO_FINANCEIRO_ID]));

    expect(result.find((template) => template.id === OPERACOES_SAAS_ID)).toBeUndefined();
    expect(result.find((template) => template.id === DIAGNOSTICO_FINANCEIRO_ID)).toBeUndefined();
  });

  test("skips removed seed templates but still adds new available ones", () => {
    const localTemplates = [byId("template-2")];
    const result = syncTemplatesWithSeed(localTemplates, templatesSeed, new Set([DIAGNOSTICO_FINANCEIRO_ID]));

    expect(result.find((template) => template.id === DIAGNOSTICO_FINANCEIRO_ID)).toBeUndefined();
    expect(result.find((template) => template.id === OPERACOES_SAAS_ID)).toBeDefined();
  });
});
