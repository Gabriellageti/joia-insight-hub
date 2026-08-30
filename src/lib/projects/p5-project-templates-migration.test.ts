import { describe, expect, test } from "bun:test";

const base = await Bun.file("supabase/migrations/20260829050000_p5_project_process_templates.sql").text();
const editor = await Bun.file("supabase/migrations/20260829051500_p5_template_editor_rpc.sql").text();
const runtime = await Bun.file("supabase/migrations/20260829052500_p5_template_auth_boundary.sql").text();
const standalone = await Bun.file("supabase/migrations/20260829053000_p5_standalone_task_templates.sql").text();

describe("P5 project and process templates", () => {
  test("uses existing projects and tasks as the operational source", () => {
    expect(base).toContain("ALTER TABLE public.tasks");
    expect(base).toContain("ALTER TABLE public.projects");
    expect(base).toContain("source_task_template_id");
    expect(base).not.toContain("CREATE TABLE public.template_generated_tasks");
  });

  test("models stages, tasks, checklists and relative dates", () => {
    expect(base).toContain("CREATE TABLE public.project_template_stages");
    expect(base).toContain("CREATE TABLE public.task_templates");
    expect(base).toContain("CREATE TABLE public.task_template_checklist_items");
    expect(runtime).toContain("tt.due_offset_days");
    expect(runtime).toContain("tt.start_offset_days");
  });

  test("applies templates atomically and idempotently", () => {
    expect(base).toContain("CREATE UNIQUE INDEX tasks_project_source_template_unique");
    expect(runtime).toContain("ON CONFLICT(project_id,source_task_template_id)");
    expect(base).toContain("project_template_instantiations");
  });

  test("duplicates selectable structure without copying physical files", () => {
    expect(base).toContain("CREATE OR REPLACE FUNCTION public.duplicate_project");
    expect(base).toContain("p_copy_tasks boolean");
    expect(base).toContain("p_copy_stages boolean");
    expect(base).toContain("p_copy_documents boolean");
    expect(base).toContain("INSERT INTO public.project_document_links");
    expect(base).not.toContain("storage.objects");
  });

  test("keeps editor and all tables workspace-scoped", () => {
    expect(editor).toContain("private.current_workspace_id()");
    expect(base).toContain("ENABLE ROW LEVEL SECURITY");
    expect(base).toContain("private.workspace_access_level(workspace_id),0)>=3");
    expect(base).toContain("REVOKE ALL ON public.project_templates");
  });

  test("supports reusable standalone task templates", () => {
    expect(standalone).toContain("CREATE OR REPLACE FUNCTION public.save_task_template");
    expect(standalone).toContain("project_template_id");
    expect(standalone).toContain("p_default_assignee_id");
    expect(standalone).toContain("p_checklist");
  });
});
