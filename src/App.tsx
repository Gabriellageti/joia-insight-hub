import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Projetos = lazy(() => import("./pages/Projetos"));
const ProjetoDetalhes = lazy(() => import("./pages/ProjetoDetalhes"));
const Diagnostico = lazy(() => import("./pages/Diagnostico"));
const PlanoAcao = lazy(() => import("./pages/PlanoAcao"));
const Indicadores = lazy(() => import("./pages/Indicadores"));
const Reunioes = lazy(() => import("./pages/Reunioes"));
const Documentos = lazy(() => import("./pages/Documentos"));
const Playbooks = lazy(() => import("./pages/Playbooks"));
const Equipe = lazy(() => import("./pages/Equipe"));
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

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
    Carregando...
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DataProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Suspense fallback={<PageFallback />}>
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/clientes" element={<Clientes />} />
                              <Route path="/clientes/:id" element={<ClienteDetalhes />} />
                              <Route path="/clientes/:id/jornada" element={<ClienteJornada />} />
                              <Route path="/projetos" element={<Projetos />} />
                              <Route path="/projetos/:id" element={<ProjetoDetalhes />} />
                              <Route path="/diagnostico" element={<Diagnostico />} />
                              <Route path="/diagnosticos/:id" element={<DiagnosticoDetalhe />} />
                              <Route path="/templates" element={<TemplatesList />} />
                              <Route path="/templates/novo" element={<TemplateCreate />} />
                              <Route path="/templates/:id/editar" element={<TemplateEdit />} />
                              <Route path="/templates/:id/preview" element={<TemplatePreview />} />
                              <Route
                                path="/templates-diagnostico/:templateId/preview"
                                element={<TemplateDiagnosticPreview />}
                              />
                              <Route path="/plano-acao" element={<PlanoAcao />} />
                              <Route path="/indicadores" element={<Indicadores />} />
                              <Route path="/reunioes" element={<Reunioes />} />
                              <Route path="/documentos" element={<Documentos />} />
                              <Route path="/playbooks" element={<Playbooks />} />
                              <Route path="/equipe" element={<Equipe />} />
                              <Route path="/financeiro" element={<Financeiro />} />
                              <Route path="/marketing" element={<Marketing />} />
                              <Route path="/configuracoes" element={<Configuracoes />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </DataProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
