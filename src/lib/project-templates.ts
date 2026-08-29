import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ProjectTemplateStatus = "draft" | "published" | "archived";

export interface ProjectTemplateSummary {
  id: string;
  name: string;
  description: string;
  projectType: string;
  defaultPhase: string;
  isInternalProcess: boolean;
  status: ProjectTemplateStatus;
  stageCount: number;
  taskCount: number;
}

export interface TemplateStageInput {
  title: string;
  description?: string;
  position: number;
}

export interface TemplateTaskInput {
  title: string;
  description?: string;
  stagePosition: number;
  priority: "low" | "medium" | "high" | "urgent";
  startOffsetDays: number;
  dueOffsetDays: number;
  initialStatus: "not_started" | "in_progress" | "waiting";
  defaultAssigneeId?: string;
  evidenceRequired?: boolean;
  position: number;
  checklist: { text: string; position: number }[];
}

export interface StandaloneTaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: TemplateTaskInput["priority"];
  startOffsetDays: number;
  dueOffsetDays: number;
  initialStatus: TemplateTaskInput["initialStatus"];
  defaultAssigneeId?: string;
  checklist: { id: string; text: string; position: number }[];
}

export async function listStandaloneTaskTemplates(): Promise<StandaloneTaskTemplate[]> {
  const { data, error } = await supabase.from("task_templates").select("id,title,description,default_priority,start_offset_days,due_offset_days,initial_status,default_assignee_id,task_template_checklist_items(id,text,position)").is("project_template_id", null).order("title");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, title: row.title, description: row.description, priority: row.default_priority as TemplateTaskInput["priority"], startOffsetDays: row.start_offset_days, dueOffsetDays: row.due_offset_days, initialStatus: row.initial_status as TemplateTaskInput["initialStatus"], defaultAssigneeId: row.default_assignee_id ?? undefined, checklist: row.task_template_checklist_items }));
}

export async function saveStandaloneTaskTemplate(input: Omit<StandaloneTaskTemplate, "id" | "checklist"> & { checklist: { text: string; position: number }[] }): Promise<string> {
  const { data, error } = await supabase.rpc("save_task_template", { p_title: input.title, p_description: input.description, p_priority: input.priority, p_start_offset_days: input.startOffsetDays, p_due_offset_days: input.dueOffsetDays, p_initial_status: input.initialStatus, p_default_assignee_id: input.defaultAssigneeId ?? null, p_checklist: input.checklist as unknown as Json });
  if (error) throw new Error(error.message);
  return data;
}

export async function listProjectTemplates(publishedOnly = false): Promise<ProjectTemplateSummary[]> {
  let query = supabase
    .from("project_templates")
    .select("id,name,description,project_type,default_phase,is_internal_process,status,project_template_stages(count),task_templates(count)")
    .order("updated_at", { ascending: false });
  if (publishedOnly) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    projectType: row.project_type,
    defaultPhase: row.default_phase,
    isInternalProcess: row.is_internal_process,
    status: row.status as ProjectTemplateStatus,
    stageCount: row.project_template_stages[0]?.count ?? 0,
    taskCount: row.task_templates[0]?.count ?? 0,
  }));
}

export async function saveProjectTemplate(input: {
  id?: string;
  name: string;
  description: string;
  projectType: string;
  defaultPhase: string;
  isInternalProcess: boolean;
  status: ProjectTemplateStatus;
  stages: TemplateStageInput[];
  tasks: TemplateTaskInput[];
}): Promise<string> {
  const { data, error } = await supabase.rpc("save_project_template", {
    p_id: input.id ?? null,
    p_name: input.name,
    p_description: input.description,
    p_project_type: input.projectType,
    p_default_phase: input.defaultPhase,
    p_is_internal_process: input.isInternalProcess,
    p_status: input.status,
    p_stages: input.stages as unknown as Json,
    p_tasks: input.tasks as unknown as Json,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function applyProjectTemplate(templateId: string, projectId: string, startDate: string, fallbackAssigneeId: string): Promise<number> {
  const { data, error } = await supabase.rpc("apply_project_template", {
    p_template_id: templateId,
    p_project_id: projectId,
    p_start_date: startDate || new Date().toISOString().slice(0, 10),
    p_fallback_assignee: fallbackAssigneeId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export interface DuplicateProjectOptions {
  sourceProjectId: string;
  name: string;
  clientId: string;
  startDate: string;
  copyTasks: boolean;
  copyStages: boolean;
  copyDocuments: boolean;
  copyAssignees: boolean;
  copySettings: boolean;
}

export async function duplicateProject(options: DuplicateProjectOptions): Promise<string> {
  const { data, error } = await supabase.rpc("duplicate_project", {
    p_source_project_id: options.sourceProjectId,
    p_name: options.name,
    p_client_id: options.clientId,
    p_start_date: options.startDate,
    p_copy_tasks: options.copyTasks,
    p_copy_stages: options.copyStages,
    p_copy_documents: options.copyDocuments,
    p_copy_assignees: options.copyAssignees,
    p_copy_settings: options.copySettings,
  });
  if (error) throw new Error(error.message);
  return data;
}
