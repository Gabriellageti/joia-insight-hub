import { DiagnosticTemplate } from "@/types";

export const syncTemplatesWithSeed = (
  localTemplates: DiagnosticTemplate[],
  seedTemplates: DiagnosticTemplate[],
  removedIds: Set<string>
) => {
  if (localTemplates.length === 0 && seedTemplates.length > 0) {
    return seedTemplates.filter((template) => !removedIds.has(template.id));
  }

  const updatedTemplates = localTemplates.map((localTemplate) => {
    const seedTemplate = seedTemplates.find((t) => t.id === localTemplate.id);
    if (!seedTemplate) return localTemplate;

    const localQuestions =
      localTemplate.questionCount ??
      localTemplate.sections?.reduce((c, s) => c + (s.questions?.length || 0), 0) ??
      0;
    const seedQuestions =
      seedTemplate.questionCount ?? seedTemplate.sections?.reduce((c, s) => c + (s.questions?.length || 0), 0) ?? 0;

    if (seedQuestions > localQuestions) {
      return { ...seedTemplate, updatedAt: seedTemplate.updatedAt };
    }
    return localTemplate;
  });

  const localIds = new Set(localTemplates.map((t) => t.id));
  const newTemplates = seedTemplates.filter((t) => !localIds.has(t.id) && !removedIds.has(t.id));

  return [...updatedTemplates, ...newTemplates];
};
