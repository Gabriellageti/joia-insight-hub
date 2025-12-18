import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TemplateForm } from "./TemplateForm";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";

export default function TemplateCreate() {
  const navigate = useNavigate();
  const { addTemplate } = useData();

  const handleSubmit = (template: Parameters<typeof addTemplate>[0]) => {
    const created = addTemplate(template);
    toast.success("Template criado com sucesso");
    navigate(`/templates/${created.id}/preview`);
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

      <TemplateForm onSubmit={handleSubmit} submitLabel="Salvar template" />
    </div>
  );
}
