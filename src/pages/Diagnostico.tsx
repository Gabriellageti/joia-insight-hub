import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, SlidersHorizontal, Sparkles, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/contexts/DataContext";
import { DiagnosticDialog } from "@/components/dialogs/DiagnosticDialog";
import { CardDiagnostico } from "@/components/diagnostico/CardDiagnostico";
import { CardTemplate } from "@/components/diagnostico/CardTemplate";
import { Diagnostic, DiagnosticTemplate } from "@/types";
import { formatDatePtBR, parseDatePtBR } from "@/lib/dates";
import { buildDuplicatedTemplateDraft, createTemplateMock } from "@/lib/diagnostics";
import { toast } from "sonner";
import { ALL_FILTER_VALUE, normalizeDiagnosticFilter } from "@/lib/select-values";
interface DiagnosticFilters {
  client: string;
  project: string;
  status: string;
  responsible: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
}

const sortOptions = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "progress", label: "Maior progresso" },
  { value: "score", label: "Maior score" },
];

function FilterContent({
  filters,
  onChange,
  diagnostics,
  onClear,
}: {
  filters: DiagnosticFilters;
  onChange: (partial: Partial<DiagnosticFilters>) => void;
  diagnostics: Diagnostic[];
  onClear: () => void;
}) {
  const uniqueClients = Array.from(new Set(diagnostics.map((d) => d.clientName))).filter(Boolean);
  const uniqueProjects = Array.from(new Set(diagnostics.map((d) => d.projectName))).filter(Boolean);
  const uniqueResponsible = Array.from(new Set(diagnostics.map((d) => d.responsibleName || ""))).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cliente</Label>
        <Select value={filters.client || ALL_FILTER_VALUE} onValueChange={(value) => onChange({ client: normalizeDiagnosticFilter(value) })}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
            {uniqueClients.map((client) => (
              <SelectItem key={client} value={client}>
                {client}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Projeto</Label>
        <Select value={filters.project || ALL_FILTER_VALUE} onValueChange={(value) => onChange({ project: normalizeDiagnosticFilter(value) })}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
            {uniqueProjects.map((project) => (
              <SelectItem key={project} value={project}>
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={filters.status || ALL_FILTER_VALUE} onValueChange={(value) => onChange({ status: normalizeDiagnosticFilter(value) })}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Responsável</Label>
        <Select value={filters.responsible || ALL_FILTER_VALUE} onValueChange={(value) => onChange({ responsible: normalizeDiagnosticFilter(value) })}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
            {uniqueResponsible.map((responsible) => (
              <SelectItem key={responsible} value={responsible}>
                {responsible}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Data inicial</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Data final</Label>
          <Input type="date" value={filters.dateTo} onChange={(e) => onChange({ dateTo: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Ordenar por</Label>
        <Select value={filters.sortBy} onValueChange={(value) => onChange({ sortBy: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" className="w-full" onClick={onClear}>
        Limpar filtros
      </Button>
    </div>
  );
}

export default function Diagnostico() {
  const navigate = useNavigate();
  const {
    diagnostics,
    templates,
    deleteDiagnostic,
    addTemplate,
    duplicateDiagnostic,
    deleteTemplate,
    templatesLoading,
  } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiagnostic, setEditingDiagnostic] = useState<Diagnostic | null>(null);
  const [activeTab, setActiveTab] = useState("diagnostics");
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | undefined>(undefined);
  const [localSearch, setLocalSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [filters, setFilters] = useState<DiagnosticFilters>({
    client: "",
    project: "",
    status: "",
    responsible: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "recent",
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [templatePage, setTemplatePage] = useState(1);

  const filteredDiagnostics = useMemo(() => {
    const search = localSearch.toLowerCase();
    const filtered = diagnostics
      .filter((d) =>
        !search
          ? true
          : [d.projectName, d.clientName, d.templateName, d.name].some((field) =>
              field?.toLowerCase().includes(search)
            )
      )
      .filter((d) => (filters.client ? d.clientName === filters.client : true))
      .filter((d) => (filters.project ? d.projectName === filters.project : true))
      .filter((d) => (filters.status ? d.status === filters.status : true))
      .filter((d) => (filters.responsible ? d.responsibleName === filters.responsible : true))
      .filter((d) => {
        if (!filters.dateFrom && !filters.dateTo) return true;
        const updated = parseDatePtBR(d.updatedAt);
        if (!updated) return true;
        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom);
          if (updated < from) return false;
        }
        if (filters.dateTo) {
          const to = new Date(filters.dateTo);
          if (updated > to) return false;
        }
        return true;
      });

    return filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "oldest":
          return (parseDatePtBR(a.updatedAt)?.getTime() || 0) - (parseDatePtBR(b.updatedAt)?.getTime() || 0);
        case "progress":
          return (b.progress || 0) - (a.progress || 0);
        case "score":
          return (b.score || 0) - (a.score || 0);
        default:
          return (parseDatePtBR(b.updatedAt)?.getTime() || 0) - (parseDatePtBR(a.updatedAt)?.getTime() || 0);
      }
    });
  }, [diagnostics, filters, localSearch]);

  const filteredTemplates = useMemo(() => {
    const search = templateSearch.toLowerCase();
    return templates
      .filter((template) => template.status !== "archived")
      .filter((template) => [template.name, template.tags?.join(" ")].some((field) => field?.toLowerCase().includes(search)));
  }, [templateSearch, templates]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
  const paginatedTemplates = filteredTemplates.slice((templatePage - 1) * pageSize, templatePage * pageSize);

  const openDialogForCreate = () => {
    setEditingDiagnostic(null);
    setDefaultTemplateId(undefined);
    setDialogOpen(true);
  };

  const handleEditDiagnostic = (diagnostic: Diagnostic) => {
    setEditingDiagnostic(diagnostic);
    setDefaultTemplateId(undefined);
    setDialogOpen(true);
  };

  const handleDuplicate = async (diagnostic: Diagnostic) => {
    const duplicated = await duplicateDiagnostic(diagnostic, {
      projectId: diagnostic.projectId,
      projectName: diagnostic.projectName,
      clientId: diagnostic.clientId,
      clientName: diagnostic.clientName,
    });
    toast.success("Diagnóstico duplicado");
    setEditingDiagnostic(duplicated);
    setDialogOpen(true);
  };

  const handleDelete = (diagnostic: Diagnostic) => {
    if (window.confirm("Deseja realmente excluir este diagnóstico?")) {
      deleteDiagnostic(diagnostic.id);
      toast.success("Diagnóstico removido");
    }
  };

  const handleApplyTemplate = (template: DiagnosticTemplate) => {
    setActiveTab("diagnostics");
    setDefaultTemplateId(template.id);
    setEditingDiagnostic(null);
    setDialogOpen(true);
  };

  const handleCreateTemplate = async () => {
    try {
      const created = await addTemplate(createTemplateMock("Novo template"));
      toast.success(`Template "${created.name}" criado`);
      setActiveTab("templates");
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível criar o template");
    }
  };

  const handleImportTemplate = async () => {
    try {
      const created = await addTemplate(createTemplateMock("Template exemplo JoIA"));
      toast.success("Template importado com sucesso");
      setActiveTab("templates");
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível importar o template");
    }
  };

  const clearFilters = () => {
    setFilters({ client: "", project: "", status: "", responsible: "", dateFrom: "", dateTo: "", sortBy: "recent" });
    setLocalSearch("");
  };

  const showDiagnosticsEmpty = filteredDiagnostics.length === 0;
  const showTemplatesEmpty = filteredTemplates.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase text-muted-foreground">Diagnósticos</p>
          <h1 className="text-2xl font-semibold text-foreground">Central de diagnósticos JoIA</h1>
          <p className="text-muted-foreground">Aplique diagnósticos padronizados, acompanhe progresso e oportunidades</p>
        </div>
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={activeTab === "diagnostics" ? openDialogForCreate : handleCreateTemplate}
          disabled={activeTab === "templates" && templatesLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          {activeTab === "diagnostics" ? "Aplicar diagnóstico" : "Criar template"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="diagnostics">Diagnósticos Aplicados</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Busca local por cliente, projeto ou template"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="hidden md:inline-flex">
                    <SlidersHorizontal className="mr-2 h-4 w-4" /> Filtros
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <FilterContent
                    filters={filters}
                    diagnostics={diagnostics}
                    onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
                    onClear={clearFilters}
                  />
                </PopoverContent>
              </Popover>
              <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="md:hidden">
                    <Filter className="mr-2 h-4 w-4" /> Filtros
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Filtros</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4">
                    <FilterContent
                      filters={filters}
                      diagnostics={diagnostics}
                      onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
                      onClear={clearFilters}
                    />
                  </div>
                  <DrawerFooter>
                    <Button onClick={() => setFilterDrawerOpen(false)}>Aplicar</Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
          <Separator />
          {showDiagnosticsEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Nenhum diagnóstico encontrado</h3>
                <p className="text-muted-foreground">
                  Aplique seu primeiro diagnóstico para começar a acompanhar progresso e oportunidades.
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>Passos rápidos:</p>
                  <ul className="list-disc list-inside">
                    <li>Escolha um projeto e um template</li>
                    <li>Defina o responsável e a data alvo</li>
                    <li>Inicie o diagnóstico para registrar respostas</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={openDialogForCreate}>Aplicar diagnóstico</Button>
                <Button variant="link" onClick={() => setActiveTab("templates")}>Ir para Templates</Button>
                <Button variant="ghost" onClick={clearFilters}>Limpar filtros</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDiagnostics.map((diagnostic) => (
                <CardDiagnostico
                  key={diagnostic.id}
                  diagnostic={diagnostic}
                  onEdit={handleEditDiagnostic}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={templateSearch}
                onChange={(e) => {
                  setTemplateSearch(e.target.value);
                  setTemplatePage(1);
                }}
                placeholder="Buscar templates por nome ou tag"
                className="pl-9"
              />
            </div>
          </div>
          <Separator />
          {showTemplatesEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Nenhum template disponível</h3>
                <p className="text-muted-foreground">
                  Crie seu primeiro template ou importe um exemplo para acelerar a aplicação de diagnósticos.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleCreateTemplate} disabled={templatesLoading}>
                  Criar template
                </Button>
                <Button variant="link" onClick={handleImportTemplate} disabled={templatesLoading}>
                  Importar exemplo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedTemplates.map((template) => (
                  <CardTemplate
                    key={template.id}
                    template={template}
                    onApply={handleApplyTemplate}
                    onEdit={(t) => navigate(`/templates/${t.id}/editar`)}
                    onDuplicate={async (t) => {
                      try {
                        const duplicated = await addTemplate(buildDuplicatedTemplateDraft(t));
                        toast.success(`Template ${duplicated.name} duplicado`);
                      } catch (error) {
                        toast.error((error as Error).message || "Não foi possível duplicar o template");
                      }
                    }}
                    onDelete={async (t) => {
                      if (window.confirm("Deseja excluir este template?")) {
                        try {
                          await deleteTemplate(t.id);
                          toast.success(`Template ${t.name} removido`);
                        } catch (error) {
                          toast.error((error as Error).message || "Não foi possível remover o template");
                        }
                      }
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Página {templatePage} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplatePage((page) => Math.max(1, page - 1))}
                    disabled={templatePage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplatePage((page) => Math.min(totalPages, page + 1))}
                    disabled={templatePage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DiagnosticDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        diagnostic={editingDiagnostic}
        defaultTemplateId={defaultTemplateId}
      />
    </div>
  );
}
