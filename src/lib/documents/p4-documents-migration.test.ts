import { describe, expect, test } from "bun:test";

const migrationPath = "supabase/migrations/20260829021434_p4_document_central.sql";
const sql = await Bun.file(migrationPath).text();

describe("P4 document central migration", () => {
  test("keeps one metadata source with atomic version history", () => {
    expect(sql).toContain("ALTER TABLE public.documents");
    expect(sql).toContain("version_group_id uuid");
    expect(sql).toContain("documents_one_current_version_idx");
    expect(sql).toContain("private.prepare_document_version()");
    expect(sql).toContain("FOR UPDATE");
  });

  test("records auditable document changes without client write grants", () => {
    expect(sql).toContain("CREATE TABLE public.document_events");
    expect(sql).toContain("private.audit_document_change()");
    expect(sql).toContain("REVOKE INSERT, UPDATE, DELETE ON public.document_events FROM authenticated, anon");
    expect(sql).toContain("CREATE POLICY document_events_member_select");
  });

  test("enforces project-aware RLS and a private constrained bucket", () => {
    expect(sql).toContain("private.user_project_access_level((SELECT auth.uid()), project_id) >= 1");
    expect(sql).toContain("UPDATE storage.buckets");
    expect(sql).toContain("public = false");
    expect(sql).toContain("file_size_limit = 52428800");
    expect(sql).toContain("WHERE document.storage_path = name");
    expect(sql).not.toContain("TO authenticated\n  USING (true)");
  });

  test("adds indexed server-side filtering and search", () => {
    expect(sql).toContain("search_vector tsvector GENERATED ALWAYS");
    expect(sql).toContain("documents_search_vector_idx");
    expect(sql).toContain("documents_workspace_client_active_idx");
    expect(sql).toContain("documents_workspace_project_active_idx");
    expect(sql).toContain("documents_workspace_uploader_active_idx");
  });
});
