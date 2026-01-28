import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AuditMetadata,
  DiagnosticTemplate,
  DiagnosticTemplateStatus,
  Diagnostic,
  OpportunityRuleCondition,
  QuestionOption,
  TemplateOpportunityRule,
  TemplateQuestion,
  TemplateSection,
} from "@/types";
import { formatDatePtBR, parseDatePtBR } from "@/lib/dates";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PostgrestError } from "@supabase/supabase-js";

// Cliente "untyped" para tabelas de templates que ainda não existem no schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedSupabase = supabase as any;

type Status = Diagnostic["status"];

type BaseDiagnosticInput = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  templateId: string;
  templateName: string;
  responsibleName?: string;
  responsibleId?: string;
  dueDate?: string;
  autoGenerateOpportunities?: boolean;
  name?: string;
};

export interface ApplyDiagnosticInput extends BaseDiagnosticInput {
  templateQuestionCount?: number;
}

export interface UpdateDiagnosticInput extends Partial<Diagnostic> {
  id: string;
}

const currentMonthLabel = () => format(new Date(), "MM/yyyy", { locale: ptBR });

const defaultName = (templateName: string, projectName: string, referenceDate: Date = new Date()) => {
  return `${templateName} • ${projectName} • ${format(referenceDate, "MM/yyyy", { locale: ptBR })}`;
};

// Templates are now 100% database-driven - no seed data

export const calculateDaysSinceUpdate = (dateString?: string): number => {
  const parsed = parseDatePtBR(dateString);
  if (!parsed) return 0;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return differenceInCalendarDays(todayMidnight, parsed);
};

export const isDiagnosticStalled = (diagnostic: Diagnostic): boolean => {
  return diagnostic.status === "in_progress" && calculateDaysSinceUpdate(diagnostic.updatedAt) > 10;
};

export const calculatePendingQuestions = (diagnostic: Diagnostic): number => {
  return Math.max(0, (diagnostic.totalQuestions || 0) - (diagnostic.answeredQuestions || 0));
};

// Tipos temporários até que as tabelas de templates sejam criadas no banco
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbTemplateRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbSectionRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbQuestionRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRuleRow = any;

type TemplateDescriptionPayload = {
  description?: string;
  tags?: string[];
  status?: DiagnosticTemplateStatus;
  version?: string;
  revision?: number;
  estimatedTimeMinutes?: number | null;
  lastPublishedAt?: string;
  audit?: AuditMetadata;
};

type SectionDescriptionPayload = {
  description?: string;
  weight?: number;
  audit?: AuditMetadata;
};

type QuestionMetadataPayload = {
  type?: TemplateQuestion["type"];
  weight?: number;
  includeInScore?: boolean;
  criticality?: TemplateQuestion["criticality"];
  required?: boolean;
  questionDescription?: string;
  helperText?: string;
  placeholder?: string;
  minValue?: number | null;
  maxValue?: number | null;
  audit?: AuditMetadata;
  optionsWithWeight?: QuestionOption[];
  allowedFileTypes?: string[];
  maxFileSizeMB?: number | null;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asUuid = (value?: string) => (value && uuidRegex.test(value) ? value : undefined);

export const isMissingTemplatesTableMessage = (message?: string): boolean => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("schema cache") ||
    normalized.includes('relation "diagnostic_templates" does not exist')
  );
};

const isMissingTemplatesTable = (error: PostgrestError | null): boolean => {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  return isMissingTemplatesTableMessage(error.message);
};

const deserializeTemplateDescription = (raw?: string | null) => {
  if (!raw) return { description: "", metadata: {} as TemplateDescriptionPayload };

  try {
    const parsed = JSON.parse(raw) as TemplateDescriptionPayload & { description?: string };

    if (parsed && typeof parsed === "object") {
      const { description = "", ...metadata } = parsed;
      return { description, metadata };
    }
  } catch {
    // ignore parsing errors and fall back to plain text
  }

  return { description: raw, metadata: {} as TemplateDescriptionPayload };
};

const serializeTemplateDescription = (template: Partial<DiagnosticTemplate> & { id?: string }) =>
  JSON.stringify({
    description: template.description || "",
    tags: template.tags || [],
    status: template.status || "draft",
    version: template.version,
    revision: template.revision,
    estimatedTimeMinutes: template.estimatedTimeMinutes ?? null,
    lastPublishedAt: template.lastPublishedAt,
    audit: template.audit,
  });

const deserializeSectionDescription = (raw?: string | null) => {
  if (!raw) return { description: "", metadata: {} as SectionDescriptionPayload };

  try {
    const parsed = JSON.parse(raw) as SectionDescriptionPayload & { description?: string };
    if (parsed && typeof parsed === "object") {
      const { description = "", ...metadata } = parsed;
      return { description, metadata };
    }
  } catch {
    // ignore parsing errors and fall back to plain text
  }

  return { description: raw, metadata: {} as SectionDescriptionPayload };
};

const serializeSectionDescription = (section: TemplateSection) =>
  JSON.stringify({
    description: section.description || "",
    weight: section.weight ?? 1,
    audit: section.audit,
  });

const serializeQuestionMetadata = (question: TemplateQuestion): QuestionMetadataPayload => ({
  type: question.type,
  weight: question.weight,
  includeInScore: question.includeInScore,
  criticality: question.criticality,
  required: question.required,
  questionDescription: question.description,
  helperText: question.helperText,
  placeholder: question.placeholder,
  minValue: question.minValue ?? null,
  maxValue: question.maxValue ?? null,
  audit: question.audit,
  optionsWithWeight: question.optionsWithWeight,
  allowedFileTypes: question.allowedFileTypes,
  maxFileSizeMB: question.maxFileSizeMB ?? null,
});

const parseQuestionMetadata = (payload: DbQuestionRow["metadata"]): QuestionMetadataPayload => {
  if (!payload || typeof payload !== "object") return {};
  return payload as QuestionMetadataPayload;
};

const mapQuestionTypeToDb = (type: TemplateQuestion["type"]): string => {
  switch (type) {
    case "yes_no":
      return "boolean";
    case "scale":
      return "rating";
    case "number":
      return "number";
    case "multiple_choice":
      return "select";
    default:
      return "text";
  }
};

const mapQuestionTypeFromDb = (dbType: string, metadataType?: TemplateQuestion["type"]): TemplateQuestion["type"] => {
  if (metadataType) return metadataType;

  switch (dbType) {
    case "boolean":
      return "yes_no";
    case "rating":
      return "scale";
    case "number":
      return "number";
    case "select":
      return "multiple_choice";
    default:
      return "text";
  }
};

const serializeQuestionOptions = (question: TemplateQuestion): QuestionOption[] => {
  if (question.optionsWithWeight?.length) return question.optionsWithWeight;
  if (question.options?.length) return question.options.map((label) => ({ label, weight: null }));
  return [];
};

const mapRuleFromDb = (rule: DbRuleRow): TemplateOpportunityRule => {
  const actions = (rule.actions as Record<string, unknown>) || {};

  return {
    id: rule.id,
    name: (actions.name as string) || rule.title || "Regra de oportunidade",
    description: (actions.description as string) || rule.description || "",
    type: ((actions.type as TemplateOpportunityRule["type"]) || "Outro") as TemplateOpportunityRule["type"],
    estimatedValue: typeof actions.estimatedValue === "number" ? actions.estimatedValue : null,
    confidence: (actions.confidence as TemplateOpportunityRule["confidence"]) || "media",
    evidenceType: (actions.evidenceType as TemplateOpportunityRule["evidenceType"]) || "a_coletar",
    enabled: (actions.enabled as boolean) ?? true,
    autoGenerate: (actions.autoGenerate as boolean) ?? true,
    condition: (rule.rule_conditions as OpportunityRuleCondition) || { type: "always" },
    audit: actions.audit as AuditMetadata | undefined,
  };
};

const mapRuleToDb = (
  rule: TemplateOpportunityRule,
  templateId: string,
  sectionId?: string,
  questionId?: string
): DbRuleRow["Insert"] => ({
  id: asUuid(rule.id),
  template_id: templateId,
  section_id: sectionId || null,
  question_id: questionId || null,
  title: rule.name,
  description: rule.description,
  rule_conditions: rule.condition ?? { type: "always" },
  actions: {
    type: rule.type,
    estimatedValue: rule.estimatedValue ?? null,
    confidence: rule.confidence,
    evidenceType: rule.evidenceType,
    enabled: rule.enabled,
    autoGenerate: rule.autoGenerate,
    name: rule.name,
    description: rule.description,
    audit: rule.audit,
  },
});

const mapQuestionFromDb = (question: DbQuestionRow, rules: DbRuleRow[]): TemplateQuestion => {
  const metadata = parseQuestionMetadata(question.metadata);
  const rawOptions = question.options as QuestionOption[] | string[] | null;
  const optionsWithWeight = (metadata.optionsWithWeight || rawOptions || []) as QuestionOption[];
  const normalizedOptions = (optionsWithWeight || []).map((option) =>
    typeof option === "string" ? { label: option, weight: null } : option
  );
  const linkedRule = rules.find((rule) => rule.question_id === question.id);

  return {
    id: question.id,
    title: question.question,
    description: metadata.questionDescription || metadata.helperText || "",
    type: mapQuestionTypeFromDb(question.question_type, metadata.type),
    weight: metadata.weight ?? 1,
    includeInScore: metadata.includeInScore ?? true,
    criticality: metadata.criticality ?? "media",
    required: metadata.required ?? true,
    helperText: metadata.helperText || "",
    placeholder: metadata.placeholder || "",
    order: question.position ?? 0,
    minValue: metadata.minValue ?? null,
    maxValue: metadata.maxValue ?? null,
    options: normalizedOptions.map((option) => option.label),
    optionsWithWeight: normalizedOptions,
    regraOportunidade: linkedRule ? mapRuleFromDb(linkedRule) : undefined,
    maxFileSizeMB: metadata.maxFileSizeMB ?? null,
    allowedFileTypes: metadata.allowedFileTypes ?? [],
    audit: metadata.audit,
  };
};

const mapSectionFromDb = (
  section: DbSectionRow,
  questions: DbQuestionRow[],
  rules: DbRuleRow[]
): TemplateSection => {
  const { description, metadata } = deserializeSectionDescription(section.description);
  const sectionQuestions = questions
    .filter((question) => question.section_id === section.id)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((question) => mapQuestionFromDb(question, rules));

  return {
    id: section.id,
    title: section.title,
    description,
    order: section.position ?? 0,
    weight: metadata.weight ?? 1,
    questions: sectionQuestions,
    audit: metadata.audit,
  };
};

const mapTemplateFromDb = (
  template: DbTemplateRow,
  sections: TemplateSection[]
): DiagnosticTemplate => {
  const { description, metadata } = deserializeTemplateDescription(template.description);
  const questionCount = sections.reduce((count, section) => count + (section.questions?.length || 0), 0);

  return {
    id: template.id,
    name: template.name,
    description,
    tags: metadata.tags || [],
    status: metadata.status || "draft",
    version: metadata.version || "v1.0",
    revision: metadata.revision ?? 1,
    sections,
    questionCount,
    sectionsCount: sections.length,
    estimatedTimeMinutes: metadata.estimatedTimeMinutes ?? null,
    lastPublishedAt: metadata.lastPublishedAt,
    updatedAt: formatDatePtBR(new Date(template.updated_at)),
    createdAt: formatDatePtBR(new Date(template.created_at)),
    audit: metadata.audit,
  };
};

const insertTemplateStructure = async (templateId: string, sections: TemplateSection[]) => {
  for (const section of sections) {
    const { data: sectionRow, error: sectionError } = await untypedSupabase
      .from("template_sections")
      .insert({
        id: asUuid(section.id),
        template_id: templateId,
        title: section.title,
        description: serializeSectionDescription(section),
        position: section.order,
      })
      .select()
      .single();

    if (sectionError || !sectionRow) {
      throw new Error(sectionError?.message || "Erro ao salvar seção do template");
    }

    for (const question of section.questions || []) {
      const { data: questionRow, error: questionError } = await untypedSupabase
        .from("template_questions")
        .insert({
          id: asUuid(question.id),
          template_id: templateId,
          section_id: sectionRow.id,
          title: question.title,
          description: question.description || null,
          type: mapQuestionTypeToDb(question.type),
          weight: question.weight ?? 1,
          criticality: question.criticality || 'media',
          required: question.required ?? false,
          position: question.order ?? 0,
          helper_text: question.helperText || null,
          min_value: question.minValue ?? null,
          max_value: question.maxValue ?? null,
          options: serializeQuestionOptions(question),
          audit: question.audit ? JSON.stringify(question.audit) : null,
        })
        .select()
        .single();

      if (questionError || !questionRow) {
        throw new Error(questionError?.message || "Erro ao salvar pergunta do template");
      }

      if (question.regraOportunidade) {
        const { error: ruleError } = await untypedSupabase
          .from("template_opportunity_rules")
          .insert(mapRuleToDb(question.regraOportunidade, templateId, sectionRow.id, questionRow.id));

        if (ruleError) {
          throw new Error(ruleError.message || "Erro ao salvar regra de oportunidade");
        }
      }
    }
  }
};

const rebuildTemplateStructure = async (templateId: string, sections: TemplateSection[]) => {
  await untypedSupabase.from("template_opportunity_rules").delete().eq("template_id", templateId);
  await untypedSupabase.from("template_questions").delete().eq("template_id", templateId);
  await untypedSupabase.from("template_sections").delete().eq("template_id", templateId);
  await insertTemplateStructure(templateId, sections);
};

const fetchTemplateById = async (id: string): Promise<DiagnosticTemplate | null> => {
  const { data: templateRow, error: templateError } = await untypedSupabase
    .from("diagnostic_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (templateError || !templateRow) return null;

  const [{ data: sections }, { data: questions }, { data: rules }] = await Promise.all([
    untypedSupabase.from("template_sections").select("*").eq("template_id", id),
    untypedSupabase.from("template_questions").select("*").eq("template_id", id),
    untypedSupabase.from("template_opportunity_rules").select("*").eq("template_id", id),
  ]);

  const sectionList = (sections || []).map((section: DbSectionRow) =>
    mapSectionFromDb(section, questions || [], rules || [])
  );

  return mapTemplateFromDb(templateRow, sectionList);
};

// Diagnostics are fetched directly in DataContext via dedicated integrations

export const fetchTemplates = async (): Promise<DiagnosticTemplate[]> => {
  const { data: templateRows, error } = await untypedSupabase
    .from("diagnostic_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingTemplatesTable(error)) {
      console.warn("Tabela diagnostic_templates não encontrada. Execute as migrações do banco.");
      return [];
    }
    throw new Error(error.message || "Erro ao carregar templates");
  }

  // Tabela vazia = nenhum template cadastrado
  if (!templateRows?.length) {
    return [];
  }

  const templateIds = templateRows.map((row: DbTemplateRow) => row.id);

  const [sectionsResponse, questionsResponse, rulesResponse] = await Promise.all([
    untypedSupabase
      .from("template_sections")
      .select("*")
      .in("template_id", templateIds)
      .order("position", { ascending: true }),
    untypedSupabase
      .from("template_questions")
      .select("*")
      .in("template_id", templateIds)
      .order("position", { ascending: true }),
    untypedSupabase.from("template_opportunity_rules").select("*").in("template_id", templateIds),
  ]);

  if (sectionsResponse.error) throw new Error(sectionsResponse.error.message);
  if (questionsResponse.error) throw new Error(questionsResponse.error.message);
  if (rulesResponse.error) throw new Error(rulesResponse.error.message);

  const sections = sectionsResponse.data || [];
  const questions = questionsResponse.data || [];
  const rules = rulesResponse.data || [];

  return templateRows.map((templateRow: DbTemplateRow) => {
    const templateSections = sections.filter((section: DbSectionRow) => section.template_id === templateRow.id);
    const mappedSections = templateSections.map((section: DbSectionRow) =>
      mapSectionFromDb(section, questions.filter((question: DbQuestionRow) => question.section_id === section.id), rules)
    );
    return mapTemplateFromDb(templateRow, mappedSections);
  });
};

export const createTemplate = async (
  template: Omit<DiagnosticTemplate, "id"> & { id?: string }
): Promise<DiagnosticTemplate> => {
  const { data: templateRow, error } = await untypedSupabase
    .from("diagnostic_templates")
    .insert({
      id: asUuid(template.id),
      name: template.name,
      description: serializeTemplateDescription(template),
    })
    .select()
    .single();

  if (error || !templateRow) {
    throw new Error(error?.message || "Erro ao criar template");
  }

  await insertTemplateStructure(templateRow.id, template.sections || []);

  return (await fetchTemplateById(templateRow.id)) || mapTemplateFromDb(templateRow, []);
};

export const updateTemplateRecord = async (
  id: string,
  template: Partial<DiagnosticTemplate>
): Promise<DiagnosticTemplate> => {
  const { error } = await untypedSupabase
    .from("diagnostic_templates")
    .update({
      name: template.name,
      description: serializeTemplateDescription({
        ...template,
        name: template.name || "",
        tags: template.tags || [],
        status: (template.status as DiagnosticTemplateStatus) || "draft",
        sections: template.sections || [],
        questionCount: template.questionCount,
        sectionsCount: template.sectionsCount,
        estimatedTimeMinutes: template.estimatedTimeMinutes ?? null,
        revision: template.revision,
        version: template.version,
        description: template.description || "",
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Erro ao atualizar template");
  }

  await rebuildTemplateStructure(id, template.sections || []);

  const updated = await fetchTemplateById(id);
  if (!updated) throw new Error("Template não encontrado após atualização");
  return updated;
};

export const deleteTemplateRecord = async (id: string) => {
  const { error } = await untypedSupabase.from("diagnostic_templates").delete().eq("id", id);
  if (error) {
    throw new Error(error.message || "Erro ao remover template");
  }
};

export const applyDiagnostic = async (input: ApplyDiagnosticInput): Promise<Diagnostic> => {
  const { templateName, projectName, templateQuestionCount } = input;
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `diagnostic-${Math.random().toString(36).slice(2, 8)}`;
  const today = formatDatePtBR(new Date());
  const totalQuestions = templateQuestionCount ?? 40;

  return {
    id,
    name: input.name || defaultName(templateName, projectName),
    status: "in_progress",
    progress: 0,
    score: undefined,
    opportunities: 0,
    createdAt: today,
    updatedAt: today,
    answeredQuestions: 0,
    totalQuestions,
    hasResponses: false,
    autoGenerateOpportunities: input.autoGenerateOpportunities ?? true,
    responsibleName: input.responsibleName || "Equipe JoIA",
    responsibleId: input.responsibleId,
    dueDate: input.dueDate,
    ...input,
  };
};

export const updateDiagnostic = async (current: Diagnostic, payload: Partial<Diagnostic>): Promise<Diagnostic> => {
  return {
    ...current,
    ...payload,
    updatedAt: payload.updatedAt || formatDatePtBR(new Date()),
  };
};

export const createTemplateMock = (name?: string): DiagnosticTemplate => {
  const id = `template-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: name || "Template importado JoIA",
    description: "Template criado a partir de importação rápida.",
    tags: ["Exemplo", "Boas práticas"],
    status: "draft",
    sections: [
      {
        id: `${id}-section-1`,
        title: "Seção importada",
        description: "Perguntas importadas para revisão.",
        order: 1,
        weight: 1,
        audit: { updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }) },
        questions: [
          {
            id: `${id}-question-1`,
            title: "Pergunta de exemplo",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 1,
            audit: { updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }) },
          },
        ],
      },
    ],
    questionCount: 1,
    sectionsCount: 1,
    estimatedTimeMinutes: 15,
    version: "v1.0",
    lastPublishedAt: undefined,
    updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
    createdAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
  };
};

const parseVersion = (version?: string) => {
  const match = version?.match(/v?(\d+)(?:\.(\d+))?/i);
  const major = match?.[1] ? Number(match[1]) : 1;
  const minor = match?.[2] ? Number(match[2]) : 0;
  return { major: Number.isNaN(major) ? 1 : major, minor: Number.isNaN(minor) ? 0 : minor };
};

export const calculateNextTemplateVersion = (
  currentVersion: string | undefined,
  changeType: "minor" | "major"
): string => {
  const { major, minor } = parseVersion(currentVersion);
  if (changeType === "major") {
    return `v${major + 1}.0`;
  }
  return `v${major}.${minor + 1}`;
};

const normalizeCopyName = (name?: string) => {
  if (!name) return "Template (Cópia)";
  const cleaned = name.replace(/\s+\(C[oó]pia\)$/i, "");
  return `${cleaned} (Cópia)`;
};

export const buildDuplicatedTemplateDraft = (
  template: DiagnosticTemplate | (Omit<DiagnosticTemplate, "id"> & { id?: string })
): Omit<DiagnosticTemplate, "id"> & { id?: string } => {
  const today = formatDatePtBR(new Date());

  return {
    ...template,
    id: undefined,
    name: normalizeCopyName(template.name),
    status: "draft",
    version: "v1.0",
    revision: 1,
    lastPublishedAt: undefined,
    updatedAt: today,
    createdAt: today,
  };
};

export const resolveStatusLabel = (status: Status) => {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "in_progress":
      return "Em andamento";
    case "completed":
      return "Concluído";
    default:
      return status;
  }
};

export const formatRelativeUpdate = (diagnostic: Diagnostic): string => {
  const days = calculateDaysSinceUpdate(diagnostic.updatedAt);
  if (days <= 0) return "Atualizado hoje";
  if (days === 1) return "Atualizado há 1 dia";
  return `Atualizado há ${days} dias`;
};

export const getDefaultDiagnosticName = (templateName: string, projectName: string) =>
  defaultName(templateName, projectName, new Date());
