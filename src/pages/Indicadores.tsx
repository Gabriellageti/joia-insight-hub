import { useState, useEffect, useMemo } from "react";
import { Plus, Upload, TrendingUp, Filter, LayoutDashboard, List, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { Indicator } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import {
  IndicatorCard,
  IndicatorChart,
  IndicatorDashboard,
  IndicatorHistoryDialog,
} from "@/components/indicadores";
import { IndicatorDialog } from "@/components/dialogs/IndicatorDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type HistoryPoint = Database["public"]["Tables"]["indicator_history"]["Row"];

export default function Indicadores() {
  const { indicators, clients, projects } = useData();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [dashboardGroupBy, setDashboardGroupBy] = useState<"category" | "project" | "status">("category");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  // Fetch history for selected indicator
  useEffect(() => {
    if (!selectedIndicator) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("indicator_history")
        .select("*")
        .eq("indicator_id", selectedIndicator.id)
        .order("recorded_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar histórico:", error);
        return;
      }
      setHistory(data || []);
    };

    fetchHistory();
  }, [selectedIndicator]);

  const categories = useMemo(() => {
    const cats = new Set(indicators.map((i) => i.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [indicators]);

  const filteredIndicators = useMemo(() => {
    return indicators.filter((indicator) => {
      const matchesSearch =
        !search ||
        indicator.name.toLowerCase().includes(search.toLowerCase()) ||
        indicator.projectName?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        filterCategory === "all" || indicator.category === filterCategory;

      const matchesProject =
        filterProject === "all" || indicator.projectId === filterProject;

      const matchesClient =
        filterClient === "all" ||
        projects.find((p) => p.id === indicator.projectId)?.clientId === filterClient;

      return matchesSearch && matchesCategory && matchesProject && matchesClient;
    });
  }, [indicators, search, filterCategory, filterProject, filterClient, projects]);

  const handleCardClick = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setDetailOpen(true);
  };

  const handleEdit = () => {
    setDetailOpen(false);
    setDialogOpen(true);
  };

  const handleNewIndicator = () => {
    setSelectedIndicator(null);
    setDialogOpen(true);
  };

  const handleHistorySuccess = async () => {
    if (!selectedIndicator) return;
    const { data } = await supabase
      .from("indicator_history")
      .select("*")
      .eq("indicator_id", selectedIndicator.id)
      .order("recorded_at", { ascending: true });
    setHistory(data || []);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Indicadores</h1>
          <p className="text-muted-foreground">
            Acompanhe KPIs, metas e prove valor com números
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={handleNewIndicator}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Indicador
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar indicador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat!}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.nomeFantasia || client.razaoSocial}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos projetos</SelectItem>
            {projects
              .filter((p) => filterClient === "all" || p.clientId === filterClient)
              .map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards" className="gap-2">
            <List className="h-4 w-4" />
            Cards
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Cards View */}
        <TabsContent value="cards">
          {filteredIndicators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhum indicador encontrado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Crie um novo indicador ou ajuste os filtros
              </p>
              <Button onClick={handleNewIndicator} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Novo Indicador
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredIndicators.map((indicator) => (
                <IndicatorCard
                  key={indicator.id}
                  indicator={indicator}
                  onClick={() => handleCardClick(indicator)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Dashboard View */}
        <TabsContent value="dashboard">
          <div className="mb-4">
            <Select
              value={dashboardGroupBy}
              onValueChange={(v) => setDashboardGroupBy(v as typeof dashboardGroupBy)}
            >
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Agrupar por Categoria</SelectItem>
                <SelectItem value="project">Agrupar por Projeto</SelectItem>
                <SelectItem value="status">Agrupar por Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <IndicatorDashboard
            indicators={filteredIndicators}
            groupBy={dashboardGroupBy}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <IndicatorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        indicator={selectedIndicator}
      />

      {selectedIndicator && (
        <IndicatorHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          indicator={selectedIndicator}
          onSuccess={handleHistorySuccess}
        />
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedIndicator?.name}
              {selectedIndicator?.category && (
                <Badge variant="outline">{selectedIndicator.category}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {selectedIndicator && (
            <ScrollArea className="h-[calc(100vh-120px)] mt-4">
              <div className="space-y-6 pr-4">
                {/* Current Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Valor Atual</p>
                    <p className="text-2xl font-bold">
                      {selectedIndicator.currentValue ?? "—"}
                      {selectedIndicator.unit && ` ${selectedIndicator.unit}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Meta</p>
                    <p className="text-2xl font-bold">
                      {selectedIndicator.targetValue ?? "—"}
                      {selectedIndicator.unit && ` ${selectedIndicator.unit}`}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <IndicatorChart
                  title="Evolução"
                  history={history}
                  targetValue={selectedIndicator.targetValue}
                  unit={selectedIndicator.unit}
                />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => setHistoryDialogOpen(true)} className="flex-1">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Registrar Valor
                  </Button>
                  <Button variant="outline" onClick={handleEdit}>
                    Editar
                  </Button>
                </div>

                {/* Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projeto</span>
                    <span>{selectedIndicator.projectName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequência</span>
                    <span>{selectedIndicator.frequency || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Responsável</span>
                    <span>{selectedIndicator.responsible || "—"}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
