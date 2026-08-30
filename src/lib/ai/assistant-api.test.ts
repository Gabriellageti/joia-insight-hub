import { describe, expect, test } from "bun:test";
import { collectContext, fallback } from "../../../api/assistant";

describe("P8 assistant API safeguards", () => {
  test("collects only explicit traceable sources and authorized ids", () => {
    const result = collectContext({ client: { id: "client-1", client_id: "client-1", source_id: "client:client-1", source_label: "Cliente 1", source_url: "/clientes/client-1" }, projects: [{ id: "project-1", project_id: "project-1", source_id: "project:project-1", source_label: "Projeto 1", source_url: "/projetos/project-1" }], untrusted: { source_id: "fake", source_label: 123 } });
    expect([...result.sources.keys()]).toEqual(["client:client-1", "project:project-1"]);
    expect(result.clientIds.has("client-1")).toBe(true);
    expect(result.projectIds.has("project-1")).toBe(true);
  });
  test("provides an honest structured fallback without inventing actions", () => {
    const answer = fallback({ tasks: [{ title: "Atrasada", status: "not_started", due_date: "2020-01-01" }], projects: [], meetings: [] });
    expect(answer).toContain("1 atrasadas");
    expect(answer).toContain("IA generativa ficou temporariamente indisponível");
    expect(answer).not.toContain("tarefa criada");
  });
});
