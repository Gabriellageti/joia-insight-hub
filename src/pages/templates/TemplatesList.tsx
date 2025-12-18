import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CardTemplate } from "@/components/diagnostico/CardTemplate";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { DiagnosticTemplate } from "@/types";
import { formatDatePtBR } from "@/lib/dates";
import { toast } from "sonner";

export default function TemplatesList() {
  const navigate = useNavigate();
  const { templates, addTemplate, deleteTemplate } = useData();
  const [search, setSearch] = useState("");

  const filteredTemplates = useMemo(() => {
    const query = search.toLowerCase();
    return templates.filter((template) =>
      [template.name, template.description, template.tags?.join(" ")]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(query))
    );
  }, [search, templates]);

  const handleDuplicate = (template: DiagnosticTemplate) => {
    const duplicated = addTemplate({
      ...template,
      id: undefined,
      name: `${template.name} (cópia)`,
      updatedAt: formatDatePtBR(new Date()),
      revision: (template.revision || 1) + 1,
    });
    toast.success(`Template "${duplicated.name}" duplicado`);
  };

  const handleDelete = (template: DiagnosticTemplate) => {
    if (window.confirm("Deseja remover este template?")) {
      deleteTemplate(template.id);
      toast.success(`Template "${template.name}" removido`);
    }
  };

  const handlePreview = (template: DiagnosticTemplate) => navigate(`/templates-diagnostico/${template.id}/preview`);
  const handleEdit = (template: DiagnosticTemplate) => navigate(`/templates/${template.id}/editar`);
  const goToCreate = () => navigate("/templates/novo");

  return (
    <div className="space-y-6">
      <TemplatePageHeader
        eyebrow="Templates"
        title="Biblioteca de templates"
        description="Catalogue e pré-visualize os templates disponíveis antes de aplicar um diagnóstico."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/diagnostico")}>
              <Eye className="h-4 w-4 mr-2" />
              Diagnósticos
            </Button>
            <Button onClick={goToCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo template
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Busque por nome, descrição ou tags"
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => setSearch("")}>
          Limpar
        </Button>
      </div>

      <Separator />

      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Nenhum template cadastrado</h3>
            <p className="text-muted-foreground">
              Comece criando um novo template ou duplicando um existente para acelerar a configuração.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={goToCreate}>Criar template</Button>
            <Button variant="outline" onClick={() => navigate("/diagnostico")}>
              Voltar para diagnósticos
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <CardTemplate
              key={template.id}
              template={template}
              onApply={handlePreview}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              primaryActionLabel="Preview completo"
            />
          ))}
        </div>
      )}
    </div>
  );
}
