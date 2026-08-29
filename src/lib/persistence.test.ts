import { describe, expect, it, mock } from "bun:test";
import { commitAfterPersistence, getFriendlyPersistenceError } from "./persistence";

describe("confirmação de persistência", () => {
  it("atualiza a interface somente depois do sucesso", async () => {
    const commit = mock(() => undefined);
    const value = await commitAfterPersistence(async () => "persistido", commit);
    expect(value).toBe("persistido");
    expect(commit).toHaveBeenCalledWith("persistido");
  });

  it("preserva a interface quando a exclusão falha", async () => {
    const commit = mock(() => undefined);
    await expect(commitAfterPersistence(async () => { throw new Error("permission denied"); }, commit)).rejects.toThrow("permission denied");
    expect(commit).not.toHaveBeenCalled();
  });

  it("traduz falhas comuns sem expor detalhes internos", () => {
    expect(getFriendlyPersistenceError({ code: "42501", message: "secret policy name" })).toContain("permissão");
    expect(getFriendlyPersistenceError({ message: "Failed to fetch" })).toContain("conexão");
  });
});
