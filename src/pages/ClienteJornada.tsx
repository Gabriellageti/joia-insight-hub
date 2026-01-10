import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientJourney } from "@/hooks/useClientJourney";
import { useData } from "@/contexts/DataContext";
import { JourneyTimeline, PhaseChecklist, NextActionsCard } from "@/components/jornada";
import { useJourneyActionHandler } from "@/components/jornada/JourneyActionHandler";

export default function ClienteJornada() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, projects, diagnostics, templates } = useData();
  
  const client = clients.find(c => c.id === id);
  const clientProjects = projects.filter(p => p.clientId === id);
  const clientDiagnostics = diagnostics.filter(d => d.clientId === id);
  
  const {
    events,
    loading,
    error,
    currentPhase,
    phases,
    suggestedActions,
    overallProgress,
    registerEvent,
    refresh,
  } = useClientJourney(id);
  
  // Only initialize handler if client exists
  const actionHandler = client ? useJourneyActionHandler({
    client,
    projects: clientProjects,
    diagnostics: clientDiagnostics,
    templates,
    currentPhase,
    onEventRegistered: async (input) => {
      await registerEvent(input);
    },
    onDataRefresh: refresh,
  }) : null;

  if (!client) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTitle>Cliente não encontrado</AlertTitle>
          <AlertDescription>
            O cliente solicitado não existe ou foi removido.
            <Link to="/clientes" className="underline ml-2">
              Voltar para a lista
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const clientName = client.nomeFantasia || client.razaoSocial || client.name || 'Cliente';
  const currentPhaseInfo = phases.find(p => p.id === currentPhase);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/clientes/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Jornada: {clientName}
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o progresso da consultoria
            </p>
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Overall Progress Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Progresso Geral da Jornada
            </CardTitle>
            <span className="text-2xl font-bold text-primary">
              {overallProgress}%
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-3 mb-4" />
          
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Fase atual: </span>
              <span className="font-medium text-foreground">
                {currentPhaseInfo?.name}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Progresso da fase: </span>
              <span className="font-medium text-foreground">
                {currentPhaseInfo?.progress}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="phases" className="space-y-4">
            <TabsList>
              <TabsTrigger value="phases">Fases & Checklist</TabsTrigger>
              <TabsTrigger value="timeline">Timeline de Eventos</TabsTrigger>
            </TabsList>

            <TabsContent value="phases" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <PhaseChecklist phases={phases} currentPhase={currentPhase} />
              )}
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Histórico de Eventos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : (
                    <JourneyTimeline events={events} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <NextActionsCard 
            actions={suggestedActions}
            onActionClick={actionHandler?.handleAction}
          />

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/diagnostico')}
              >
                Iniciar Diagnóstico
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/reunioes')}
              >
                Agendar Reunião
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/plano-acao')}
              >
                Ver Plano de Ação
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/documentos')}
              >
                Ver Documentos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar jornada</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      
      {/* Dialogs for automated actions */}
      {actionHandler?.renderDialogs()}
    </div>
  );
}
