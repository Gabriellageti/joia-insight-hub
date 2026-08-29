import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { PwaInstallProvider } from "@/components/pwa/PwaInstallProvider";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MeuDia = lazy(() => import("./pages/MeuDia"));
const MinhasTarefas = lazy(() => import("./pages/MinhasTarefas"));
const Pendencias = lazy(() => import("./pages/Pendencias"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Projetos = lazy(() => import("./pages/Projetos"));
const ProjetoDetalhes = lazy(() => import("./pages/ProjetoDetalhes"));
const Diagnostico = lazy(() => import("./pages/Diagnostico"));
const PlanoAcao = lazy(() => import("./pages/PlanoAcao"));
const Indicadores = lazy(() => import("./pages/Indicadores"));
const Reunioes = lazy(() => import("./pages/Reunioes"));
const ReuniaoDetalhes = lazy(() => import("./pages/ReuniaoDetalhes"));
const Documentos = lazy(() => import("./pages/Documentos"));
const Playbooks = lazy(() => import("./pages/Playbooks"));
const Equipe = lazy(() => import("./pages/Equipe"));
const Atividades = lazy(() => import("./pages/Atividades"));
const RelatorioOperacional = lazy(() => import("./pages/RelatorioOperacional"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClienteDetalhes = lazy(() => import("./pages/ClienteDetalhes"));
const ClienteJornada = lazy(() => import("./pages/ClienteJornada"));
const DiagnosticoDetalhe = lazy(() => import("./pages/DiagnosticoDetalhe"));
const TemplatesList = lazy(() => import("./pages/templates/TemplatesList"));
const TemplateCreate = lazy(() => import("./pages/templates/TemplateCreate"));
const TemplateEdit = lazy(() => import("./pages/templates/TemplateEdit"));
const TemplatePreview = lazy(() => import("./pages/templates/TemplatePreview"));
const TemplateDiagnosticPreview = lazy(() => import("./pages/templates/TemplateDiagnosticPreview"));
const ProjectTemplates = lazy(() => import("./pages/ProjectTemplates"));

const queryClient = new QueryClient();

function RouteBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

function RouteLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-live="polite">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Carregando página</span>
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <PwaInstallProvider>
              <DataProvider>
              <Toaster />
              <Sonner />
                <RouteBoundary>
                  <Suspense fallback={<RouteLoading />}>
                <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/meu-dia" replace />} />
                          <Route path="/meu-dia" element={<MeuDia />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/clientes" element={<Clientes />} />
                          <Route path="/clientes/:id" element={<ClienteDetalhes />} />
                          <Route path="/clientes/:id/jornada" element={<ClienteJornada />} />
                          <Route path="/projetos" element={<Projetos />} />
                          <Route path="/projetos/:id" element={<ProjetoDetalhes />} />
                          <Route path="/diagnostico" element={<Diagnostico />} />
                          <Route path="/diagnosticos/:id" element={<DiagnosticoDetalhe />} />
                          <Route path="/templates" element={<TemplatesList />} />
                          <Route path="/modelos-projeto" element={<ProjectTemplates />} />
                          <Route path="/templates/novo" element={<TemplateCreate />} />
                          <Route path="/templates/:id/editar" element={<TemplateEdit />} />
                          <Route path="/templates/:id/preview" element={<TemplatePreview />} />
                          <Route
                            path="/templates-diagnostico/:templateId/preview"
                            element={<TemplateDiagnosticPreview />}
                          />
                          <Route path="/plano-acao" element={<PlanoAcao />} />
                          <Route path="/minhas-tarefas" element={<MinhasTarefas />} />
                          <Route path="/pendencias" element={<Pendencias />} />
                          <Route path="/indicadores" element={<Indicadores />} />
                          <Route path="/reunioes" element={<Reunioes />} />
                          <Route path="/reunioes/:id" element={<ReuniaoDetalhes />} />
                          <Route path="/documentos" element={<Documentos />} />
                          <Route path="/playbooks" element={<AdminRoute><Playbooks /></AdminRoute>} />
                          <Route path="/equipe" element={<AdminRoute><Equipe /></AdminRoute>} />
                          <Route path="/atividades" element={<AdminRoute><Atividades /></AdminRoute>} />
                          <Route path="/relatorios/operacional" element={<AdminRoute><RelatorioOperacional /></AdminRoute>} />
                          <Route path="/financeiro" element={<AdminRoute><Financeiro /></AdminRoute>} />
                          <Route path="/marketing" element={<AdminRoute><Marketing /></AdminRoute>} />
                          <Route path="/configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                </Routes>
                  </Suspense>
                </RouteBoundary>
              </DataProvider>
            </PwaInstallProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
