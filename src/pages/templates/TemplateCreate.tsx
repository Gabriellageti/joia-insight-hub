import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { TemplateBuilder, TemplateBuilderAction } from "@/components/diagnostico/template-builder";
import { buildDuplicatedTemplateDraft } from "@/lib/diagnostics";
import { DiagnosticTemplate } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function TemplateCreate() {
  const navigate = useNavigate();
  const { addTemplate } = useData();
  const { user } = useAuth();

  const userRole = (user?.user_metadata as Record<string, string | undefined> | undefined)?.role;
  const isAnalyst = (userRole || "").toLowerCase().includes("analista");

  const handleSubmit = (template: Parameters<typeof addTemplate>[0], action: TemplateBuilderAction) => {
    if (isAnalyst) {
      toast.error("Analistas não podem criar, editar ou publicar templates.");
      return;
    }

    if (action === "duplicate") {
      const duplicated = addTemplate(buildDuplicatedTemplateDraft(template as DiagnosticTemplate));
      toast.success("Template duplicado");
      navigate(`/templates/${duplicated.id}/editar`);
      return;
    }

    const created = addTemplate(template);
    const actionMessage =
      action === "publish"
        ? "Template publicado"
        : action === "preview"
          ? "Preview salvo"
          : "Rascunho salvo";

    toast.success(actionMessage);

    if (action === "preview" || action === "publish") {
      navigate(`/templates/${created.id}/preview`);
    } else {
      navigate(`/templates/${created.id}/editar`);
    }
  };

  return (
    <div className="space-y-6">
      <TemplatePageHeader
        eyebrow="Templates"
        title="Cadastrar template"
        description="Defina a estrutura e as perguntas que serão aplicadas nos diagnósticos."
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        }
      />

      <TemplateBuilder onSubmit={handleSubmit} />
    </div>
  );
}
