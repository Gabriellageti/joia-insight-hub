import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { TemplateBuilder, TemplateBuilderAction } from "@/components/diagnostico/template-builder";

export default function TemplateCreate() {
  const navigate = useNavigate();
  const { addTemplate } = useData();

  const handleSubmit = (template: Parameters<typeof addTemplate>[0], action: TemplateBuilderAction) => {
    const created = addTemplate(template);
    const actionMessage =
      action === "publish"
        ? "Template publicado"
        : action === "duplicate"
          ? "Template duplicado"
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
