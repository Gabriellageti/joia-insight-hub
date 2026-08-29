import { describe, expect, it } from "bun:test";

const migrationPath = new URL("../../supabase/migrations/20260721220208_secure_workspace_authorization.sql", import.meta.url);
const sql = await Bun.file(migrationPath).text();

describe("migration de isolamento por workspace", () => {
  it("remove políticas históricas antes de criar políticas restritivas", () => {
    expect(sql).toContain("FROM pg_policies");
    expect(sql).toContain("workspace_access_level(workspace_id)");
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,180}(USING|WITH CHECK)\s*\(true\)/i);
  });

  it("não concede membership automática a contas sem papel confiável", () => {
    expect(sql).toContain("FROM public.user_roles AS roles");
    expect(sql.toLowerCase()).toContain("accounts receive no access by default");
  });

  it("protege storage por prefixo UUID do workspace", () => {
    expect(sql).toContain("storage_workspace_id(name)");
    expect(sql).toContain("bucket_id = 'documents'");
    expect(sql).toContain("workspace_access_level(private.storage_workspace_id(name))");
  });

  it("remove o bypass de projeto baseado em papel global", () => {
    const accessFunction = sql.match(/CREATE OR REPLACE FUNCTION private\.user_project_access_level[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(accessFunction).toContain("public.project_members");
    expect(accessFunction).not.toContain("user_has_role");
  });
});
