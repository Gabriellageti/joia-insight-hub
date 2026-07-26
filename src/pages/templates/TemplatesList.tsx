import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CardTemplate } from "@/components/diagnostico/CardTemplate";
import { TemplatePageHeader } from "./TemplatePageHeader";
import { useData } from "@/contexts/DataContext";
import { DiagnosticTemplate } from "@/types";
import { formatDatePtBR } from "@/lib/dates";
import { toast } from "sonner";
import { buildDuplicatedTemplateDraft } from "@/lib/diagnostics";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TemplatesList() {
  const navigate = useNavigate();
  const { templates, addTemplate, updateTemplate, templatesLoading, templatesError } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const userRole = (user?.user_metadata as Record<string, string | undefined> | undefined)?.role;
  const isAnalyst = (userRole || "").toLowerCase().includes("analista");
  const canArchive = !isAnalyst;

  const filteredTemplates = useMemo(() => {
    const query = search.toLowerCase();
    return templates.filter((template) =>
      [template.name, template.description, template.tags?.join(" ")]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(query))
    );
  }, [search, templates]);

  const handleDuplicate = async (template: DiagnosticTemplate) => {
    if (isAnalyst) {
      toast.error("Analistas não podem criar ou duplicar templates.");
      return;
    }
    try {
      const duplicated = await addTemplate(buildDuplicatedTemplateDraft(template));
      toast.success(`Template "${duplicated.name}" duplicado`);
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível duplicar o template");
    }
  };

  const handlePreview = (template: DiagnosticTemplate) => {
    if (template.status === "archived") {
      toast.error("Templates arquivados não podem ser aplicados.");
      return;
    }
    navigate(`/templates-diagnostico/${template.id}/preview`);
  };
  const handleEdit = (template: DiagnosticTemplate) => {
    if (isAnalyst) {
      toast.error("Analistas não podem editar templates.");
      return;
    }
    navigate(`/templates/${template.id}/editar`);
  };
  const goToCreate = () => {
    if (isAnalyst) {
      toast.error("Analistas não podem criar templates.");
      return;
    }
    navigate("/templates/novo");
  };

  const handleArchive = async (template: DiagnosticTemplate) => {
    if (isAnalyst) {
      toast.error("Analistas não podem arquivar templates.");
      return;
    }
    try {
      await updateTemplate(template.id, { status: "archived", updatedAt: formatDatePtBR(new Date()) });
      toast.success(`Template "${template.name}" arquivado`);
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível arquivar o template");
    }
  };

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

      {templatesLoading && templates.length === 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando templates...
        </div>
      )}

      {templatesError && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar templates</AlertTitle>
          <AlertDescription>{templatesError}</AlertDescription>
        </Alert>
      )}

      {filteredTemplates.length === 0 && !templatesLoading ? (
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
              onArchive={handleArchive}
              canArchive={canArchive}
              disableApply={template.status === "archived"}
              primaryActionLabel="Preview completo"
            />
          ))}
        </div>
      )}
    </div>
  );
}
