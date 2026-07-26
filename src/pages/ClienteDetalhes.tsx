import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useClientJourney } from "@/hooks/useClientJourney";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Building2, MapPin, PhoneCall, Shield, Trash, Rocket, FileSearch, Route, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isPastDate } from "@/lib/dates";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { DiagnosticDialog } from "@/components/dialogs/DiagnosticDialog";
import { toast } from "sonner";

const riskColors = { low: "bg-green-500/10 text-green-700", medium: "bg-yellow-500/10 text-yellow-700", high: "bg-red-500/10 text-red-700" };
const phaseColors: Record<string, string> = {
  onboarding: 'bg-blue-500',
  definition: 'bg-amber-500',
  execution: 'bg-green-500',
  validation: 'bg-purple-500',
};
const phaseNames: Record<string, string> = {
  onboarding: 'Onboarding',
  definition: 'Definição',
  execution: 'Execução',
  validation: 'Validação',
};
const riskLabels = { low: "Baixo", medium: "Médio", high: "Alto" };
const getInitials = (value?: string) => value?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "--";

// Helper to get address as string
const getAddressString = (address?: string | { logradouro?: string; cidade?: string; uf?: string }): string => {
  if (!address) return "";
  if (typeof address === "string") return address;
  const parts = [address.logradouro, address.cidade, address.uf].filter(Boolean);
  return parts.join(", ");
};

export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, projects, clientContacts, deleteClient, diagnostics, templates } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [diagnosticDialogOpen, setDiagnosticDialogOpen] = useState(false);

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id]);
  const clientProjects = useMemo(() => projects.filter((project) => project.clientId === id), [projects, id]);
  const contacts = useMemo(() => clientContacts.filter((contact) => contact.clientId === id), [clientContacts, id]);
  
  // Hook de jornada do cliente
  const { currentPhase, phases, overallProgress } = useClientJourney(id);
  const currentPhaseInfo = phases.find(p => p.id === currentPhase);
  
  // Verificar se já existe kickoff para este cliente
  const kickoffTemplate = templates.find((t) => t.name?.toLowerCase().includes("kickoff"));
  const hasKickoff = diagnostics.some(
    (d) => d.clientId === id && (d.templateId === kickoffTemplate?.id || d.templateName?.toLowerCase().includes("kickoff"))
  );
  const kickoffCompleted = diagnostics.some(
    (d) => d.clientId === id && (d.templateId === kickoffTemplate?.id || d.templateName?.toLowerCase().includes("kickoff")) && d.status === "completed"
  );

  const handleDelete = async () => {
    if (!client) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir ${client.nomeFantasia || client.razaoSocial || client.name || "o cliente"}?`
    );

    if (!confirmed) return;

    try {
      await deleteClient(client.id);
      toast.success("Cliente excluído com sucesso");
      navigate("/clientes");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível excluir o cliente");
    }
  };

  if (!client) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Cliente não encontrado</AlertTitle>
          <AlertDescription>Não foi possível localizar os dados deste cliente. Retorne para a lista para tentar novamente.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/clientes">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Clientes
          </Link>
        </Button>
      </div>
    );
  }

  const responsaveis = clientProjects
    .map((project) => project.responsible || project.responsibleNameLegacy)
    .filter(Boolean);

  const checklistItems = [
    {
      id: "projects",
      title: "Criar primeiro projeto",
      description: clientProjects.length > 0 ? `${clientProjects.length} projeto(s) em andamento` : "Nenhum projeto cadastrado para este cliente",
      completed: clientProjects.length > 0,
    },
    {
      id: "kickoff",
      title: "Rodar Kickoff",
      description: kickoffCompleted
        ? "Kickoff concluído"
        : hasKickoff
          ? "Kickoff em andamento"
          : "Execute o diagnóstico inicial para mapear dores e priorizar áreas",
      completed: kickoffCompleted,
      action: !kickoffCompleted && clientProjects.length > 0 ? () => setDiagnosticDialogOpen(true) : undefined,
      actionLabel: hasKickoff ? "Continuar" : "Iniciar Kickoff",
    },
    {
      id: "contacts",
      title: "Adicionar mais contatos",
      description: contacts.length > 0 ? `${contacts.length} contato(s) cadastrados` : "Nenhum contato registrado",
      completed: contacts.length > 1,
    },
    {
      id: "address",
      title: "Confirmar endereço",
      description: getAddressString(client.address) || "Endereço ainda não informado",
      completed: Boolean(getAddressString(client.address).trim().length > 0),
    },
    {
      id: "owners",
      title: "Definir responsáveis",
      description: responsaveis.length > 0 ? `Responsável(is): ${responsaveis.join(", ")}` : "Defina responsáveis nos projetos deste cliente",
      completed: responsaveis.length > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner de sugestão de Kickoff */}
      {clientProjects.length > 0 && !hasKickoff && (
        <Alert className="border-accent/50 bg-accent/5">
          <Rocket className="h-4 w-4 text-accent" />
          <AlertTitle className="text-accent">Próximo passo: Rodar o Kickoff</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Execute o diagnóstico de Kickoff para mapear dores e definir as áreas prioritárias do projeto.
            </span>
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 ml-4"
              onClick={() => setDiagnosticDialogOpen(true)}
            >
              <FileSearch className="h-4 w-4 mr-2" />
              Iniciar Kickoff
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="h-auto px-2 text-muted-foreground hover:text-foreground">
            <Link to="/clientes" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <h1 className="text-2xl font-semibold text-foreground">{client.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={client.status === "ativo" ? "default" : "secondary"}>
            {client.status === "ativo" ? "Ativo" : "Inativo"}
          </Badge>
          <Button variant="outline" onClick={() => navigate(`/clientes/${id}/jornada`)}>
            <Route className="h-4 w-4 mr-2" />
            Ver Jornada
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Editar
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={handleDelete}>
            <Trash className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Card de Fase Atual da Jornada */}
      <Card className="border-primary/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/clientes/${id}/jornada`)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${phaseColors[currentPhase]} flex items-center justify-center`}>
                <Route className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fase atual da jornada</p>
                <p className="text-lg font-semibold">{phaseNames[currentPhase]}</p>
                <p className="text-sm text-muted-foreground">
                  {currentPhaseInfo?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{overallProgress}%</p>
                <p className="text-xs text-muted-foreground">progresso geral</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <Progress value={overallProgress} className="h-2 mt-4" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Informações gerais</CardTitle>
              <p className="text-sm text-muted-foreground">Dados principais do cliente</p>
            </div>
            <Badge className={riskColors[client.risk]} variant="outline">
              Risco {riskLabels[client.risk]}
            </Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Segmento</p>
                <p className="font-medium">{client.segment || "Não informado"}</p>
                {client.tradeName && <p className="text-sm text-muted-foreground">{client.tradeName}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Shield className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">NPS</p>
                <p className="font-medium">{client.nps || 0}</p>
                <p className="text-sm text-muted-foreground">Último contato: {client.lastContact}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Localização</p>
                <p className="font-medium">{client.city || "Cidade não informada"}</p>
                <p className="text-sm text-muted-foreground">{getAddressString(client.address) || "Endereço não informado"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <PhoneCall className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Contatos</p>
                <p className="font-medium">{contacts.length} contato(s)</p>
                <p className="text-sm text-muted-foreground">
                  {client.followUpFrequency ? `Follow-up ${client.followUpFrequency}` : "Frequência de acompanhamento não definida"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos passos</CardTitle>
            <p className="text-sm text-muted-foreground">Checklist dinâmico com base nos dados deste cliente.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklistItems.map((item) => (
              <div key={item.id}>
                <div className="flex items-start gap-3">
                  <Checkbox checked={item.completed} aria-label={item.title} disabled className="mt-1" />
                  <div>
                    <p className="font-medium leading-none">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </div>
                {item.id !== checklistItems[checklistItems.length - 1].id && <Separator className="my-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Projetos relacionados</CardTitle>
            <p className="text-sm text-muted-foreground">Visão rápida dos projetos deste cliente.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/projetos">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {clientProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado para este cliente.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientProjects.map((project) => {
                const responsibleName = project.responsible || project.responsibleNameLegacy || "Responsável pendente";
                const forecastEndDate = project.forecastEndDate || project.endDate || "";
                const overdue = forecastEndDate ? isPastDate(forecastEndDate) : false;
                return (
                  <div key={project.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{project.name}</p>
                      <Badge variant="outline">{project.phase}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-primary">{getInitials(responsibleName)}</AvatarFallback>
                      </Avatar>
                      <span>{responsibleName}</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1 cursor-help">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progresso</span>
                              <span className="font-semibold text-foreground">{Math.round(project.progress)}%</span>
                            </div>
                            <Progress value={project.progress} className="h-1.5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Calculado por tarefas, entregáveis e fases</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.startDate || "Sem início"}</span>
                      <span>→</span>
                      <div className="flex items-center gap-2">
                        <span>{forecastEndDate || "Sem previsão"}</span>
                        {overdue && <Badge variant="destructive">Atrasado</Badge>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} client={client} />
      <DiagnosticDialog 
        open={diagnosticDialogOpen} 
        onOpenChange={setDiagnosticDialogOpen}
        defaultTemplateId={kickoffTemplate?.id}
      />
    </div>
  );
}
