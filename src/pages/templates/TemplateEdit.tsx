import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { formatDatePtBR } from "@/lib/dates";
import { TemplateBuilder, TemplateBuilderAction } from "@/components/diagnostico/template-builder";
import { buildDuplicatedTemplateDraft } from "@/lib/diagnostics";
import { DiagnosticTemplate } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function TemplateEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { templates, updateTemplate, addTemplate, templatesLoading, templatesError } = useData();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const userRole = (user?.user_metadata as Record<string, string | undefined> | undefined)?.role;
  const isAnalyst = (userRole || "").toLowerCase().includes("analista");

  const template = useMemo(() => templates.find((item) => item.id === id), [id, templates]);

  if (templatesLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando template...
      </div>
    );
  }

  if (templatesError) {
    return (
      <div className="py-16">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTitle>Erro ao carregar template</AlertTitle>
          <AlertDescription>{templatesError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-lg font-semibold">Template não encontrado</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/templates")}>
            Voltar
          </Button>
          <Button onClick={() => navigate("/templates/novo")}>Criar novo</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (payload: Parameters<typeof updateTemplate>[1], action: TemplateBuilderAction) => {
    if (isAnalyst) {
      toast.error("Analistas não podem criar, editar ou publicar templates.");
      return;
    }

    setIsSaving(true);

    try {
      if (action === "duplicate") {
        const duplicated = await addTemplate(buildDuplicatedTemplateDraft(payload as DiagnosticTemplate));
        toast.success(`Template "${duplicated.name}" duplicado`);
        navigate(`/templates/${duplicated.id}/editar`);
        return;
      }

      const updatedTemplate = { ...payload, updatedAt: formatDatePtBR(new Date()) };
      await updateTemplate(id!, updatedTemplate);
      const actionMessage =
        action === "publish" ? "Template publicado" : action === "preview" ? "Preview atualizado" : "Rascunho salvo";
      toast.success(actionMessage);

      if (action === "preview" || action === "publish") {
        navigate(`/templates-diagnostico/${id}/preview`);
      }
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível salvar o template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <TemplatePageHeader
        eyebrow="Templates"
        title="Editar template"
        description="Atualize perguntas e metadados antes de publicar ou duplicar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          </div>
        }
      />

      <TemplateBuilder initialTemplate={template} onSubmit={handleSubmit} isSubmitting={isSaving} />
    </div>
  );
}
