import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Projetos from "./pages/Projetos";
import Diagnostico from "./pages/Diagnostico";
import PlanoAcao from "./pages/PlanoAcao";
import Indicadores from "./pages/Indicadores";
import Reunioes from "./pages/Reunioes";
import Documentos from "./pages/Documentos";
import Playbooks from "./pages/Playbooks";
import Equipe from "./pages/Equipe";
import Financeiro from "./pages/Financeiro";
import Marketing from "./pages/Marketing";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ClienteDetalhes from "./pages/ClienteDetalhes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/clientes" element={<Clientes />} />
                        <Route path="/clientes/:id" element={<ClienteDetalhes />} />
                        <Route path="/projetos" element={<Projetos />} />
                        <Route path="/diagnostico" element={<Diagnostico />} />
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
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
