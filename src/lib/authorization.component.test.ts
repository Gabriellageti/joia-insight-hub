import { describe, expect, it } from "vitest";
import { hasWorkspaceRole, isAllowed } from "./authorization";

describe("autorização confiável", () => {
  it("nega privilégios quando não há papel explícito", () => {
    expect(isAllowed("workspace.read", null)).toBe(false);
    expect(isAllowed("templates.create", undefined)).toBe(false);
  });

  it("separa leitura, gestão e exclusão de templates", () => {
    expect(isAllowed("templates.read", "viewer")).toBe(true);
    expect(isAllowed("templates.create", "member")).toBe(false);
    expect(isAllowed("templates.archive", "manager")).toBe(true);
    expect(isAllowed("templates.delete", "manager")).toBe(false);
    expect(isAllowed("templates.delete", "admin")).toBe(true);
    expect(hasWorkspaceRole("owner", "admin")).toBe(true);
  });

  it("aceita o papel financeiro somente junto de membership validada", () => {
    expect(isAllowed("finance.read", null, ["financeiro_joia"])).toBe(false);
    expect(isAllowed("finance.read", "member", ["financeiro_joia"])).toBe(true);
    expect(isAllowed("finance.write", "manager", [])).toBe(true);
  });
});
