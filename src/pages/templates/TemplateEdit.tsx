import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TemplateForm } from "./TemplateForm";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { formatDatePtBR } from "@/lib/dates";

export default function TemplateEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { templates, updateTemplate, addTemplate } = useData();

  const template = useMemo(() => templates.find((item) => item.id === id), [id, templates]);

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

  const handleSubmit = (payload: Parameters<typeof updateTemplate>[1]) => {
    updateTemplate(id!, { ...payload, updatedAt: formatDatePtBR(new Date()) });
    toast.success("Template atualizado");
    navigate(`/templates/${id}/preview`);
  };

  const handleDuplicate = () => {
    const duplicated = addTemplate({
      ...template,
      id: undefined,
      name: `${template.name} (cópia)`,
      updatedAt: formatDatePtBR(new Date()),
      revision: (template.revision || 1) + 1,
    });
    toast.success(`Template "${duplicated.name}" duplicado`);
    navigate(`/templates/${duplicated.id}/editar`);
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
            <Button variant="secondary" onClick={() => navigate(`/templates/${id}/preview`)}>
              Preview completo
            </Button>
            <Button onClick={handleDuplicate}>Duplicar</Button>
          </div>
        }
      />

      <TemplateForm initialTemplate={template} onSubmit={handleSubmit} submitLabel="Salvar alterações" />
    </div>
  );
}
