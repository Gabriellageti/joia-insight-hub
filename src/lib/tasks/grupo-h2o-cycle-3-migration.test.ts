import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260721211830_seed_grupo_h2o_ciclo_3.sql", import.meta.url),
  "utf8",
);

describe("Grupo H2O Ciclo 3 migration", () => {
  test("vincula somente ao projeto existente com o nome exato", () => {
    expect(migration).toContain("lower(trim(name)) = lower('Grupo H2O - Consultoria')");
    expect(migration).not.toMatch(/INSERT INTO public\.projects/i);
  });

  test("cadastra oito dias e 101 tarefas na ordem informada", () => {
    const taskRows = [...migration.matchAll(/^\s*\(([1-8])::smallint,\s*(\d+),\s*'[^']*(?:''[^']*)*'\),?$/gm)]
      .map((match) => ({ day: Number(match[1]), order: Number(match[2]) }));
    const expectedCounts = [9, 11, 12, 12, 14, 13, 13, 17];

    expect(taskRows).toHaveLength(101);
    expectedCounts.forEach((count, index) => {
      expect(taskRows.filter(({ day }) => day === index + 1).map(({ order }) => order)).toEqual(
        Array.from({ length: count }, (_, taskIndex) => taskIndex + 1),
      );
    });
  });

  test("usa chaves estáveis e upserts idempotentes", () => {
    expect(migration).toContain("h2o-ciclo3-plano-acao-v1");
    expect(migration).toContain("h2o-ciclo3-dia-%s-tarefa-%s");
    expect(migration).toContain("ON CONFLICT (project_id, day_number) DO UPDATE");
    expect(migration).toContain("ON CONFLICT (source_diagnostic_id, source_action_id)");
    expect(migration).toMatch(/'backlog', 'project'/);
    expect(migration).toMatch(/NULL, NULL, NULL, NULL, day_number/);
  });
});
