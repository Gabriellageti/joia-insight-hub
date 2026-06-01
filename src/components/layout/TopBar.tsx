import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  FileSearch,
  FolderKanban,
  LineChart,
  ListTodo,
  LogOut,
  Plus,
  Search,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import { LeadDialog } from "@/components/dialogs/LeadDialog";
import { toast } from "sonner";

type SearchResult = {
  id: string;
  type: "Cliente" | "Projeto" | "Tarefa" | "Diagnóstico" | "Reunião" | "Lead";
  title: string;
  subtitle: string;
  href: string;
  icon: typeof Users;
};

const normalize = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { clients, projects, tasks, diagnostics, meetings, leads } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
  };

  const searchResults = useMemo<SearchResult[]>(() => {
    const term = normalize(searchTerm.trim());
    if (term.length < 2) return [];

    const results: SearchResult[] = [
      ...clients.map((client) => ({
        id: `client-${client.id}`,
        type: "Cliente" as const,
        title: client.nomeFantasia || client.razaoSocial || client.name || "Cliente",
        subtitle: [client.cnpj, client.contatoPrincipal?.nome, client.status].filter(Boolean).join(" · "),
        href: `/clientes/${client.id}`,
        icon: Users,
      })),
      ...projects.map((project) => ({
        id: `project-${project.id}`,
        type: "Projeto" as const,
        title: project.name,
        subtitle: [project.clientName, project.phase, project.responsible].filter(Boolean).join(" · "),
        href: `/projetos/${project.id}`,
        icon: FolderKanban,
      })),
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        type: "Tarefa" as const,
        title: task.title,
        subtitle: [task.clientName, task.projectName, task.responsible, task.dueDate].filter(Boolean).join(" · "),
        href: "/plano-acao",
        icon: ListTodo,
      })),
      ...diagnostics.map((diagnostic) => ({
        id: `diagnostic-${diagnostic.id}`,
        type: "Diagnóstico" as const,
        title: diagnostic.name,
        subtitle: [diagnostic.clientName, diagnostic.projectName, diagnostic.status].filter(Boolean).join(" · "),
        href: `/diagnosticos/${diagnostic.id}`,
        icon: FileSearch,
      })),
      ...meetings.map((meeting) => ({
        id: `meeting-${meeting.id}`,
        type: "Reunião" as const,
        title: meeting.title,
        subtitle: [meeting.clientName, meeting.projectName, meeting.date, meeting.time].filter(Boolean).join(" · "),
        href: "/reunioes",
        icon: CalendarDays,
      })),
      ...leads.map((lead) => ({
        id: `lead-${lead.id}`,
        type: "Lead" as const,
        title: lead.company,
        subtitle: [lead.contact, lead.status, lead.nextAction].filter(Boolean).join(" · "),
        href: "/marketing",
        icon: LineChart,
      })),
    ];

    return results
      .filter((result) => normalize(`${result.title} ${result.subtitle} ${result.type}`).includes(term))
      .slice(0, 8);
  }, [clients, diagnostics, leads, meetings, projects, searchTerm, tasks]);

  const openResult = (href: string) => {
    navigate(href);
    setSearchTerm("");
    setSearchOpen(false);
  };

  const goTo = (href: string) => {
    navigate(href);
  };

  const userInitial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || 
                      user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        <Popover open={searchOpen && searchTerm.trim().length >= 2} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <div className="relative w-80 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0]) {
                    openResult(searchResults[0].href);
                  }
                }}
                placeholder="Buscar cliente, projeto, tarefa..."
                className="pl-9 bg-background"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-1">
            <div className="max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((result) => {
                  const Icon = result.icon;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                      onClick={() => openResult(result.href)}
                    >
                      <div className="mt-0.5 rounded-md bg-accent/15 p-1.5 text-accent">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{result.title}</p>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {result.type}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{result.subtitle || "Sem detalhes"}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Ação Rápida
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setClientDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Criar Cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setProjectDialogOpen(true)}>
              <FolderKanban className="h-4 w-4 mr-2" />
              Criar Projeto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTaskDialogOpen(true)}>
              <ListTodo className="h-4 w-4 mr-2" />
              Criar Tarefa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMeetingDialogOpen(true)}>
              <CalendarDays className="h-4 w-4 mr-2" />
              Agendar Reunião
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => goTo("/financeiro")}>
              <WalletCards className="h-4 w-4 mr-2" />
              Abrir Financeiro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLeadDialogOpen(true)}>
              <LineChart className="h-4 w-4 mr-2" />
              Registrar Oportunidade
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => goTo("/documentos")}>
              <Upload className="h-4 w-4 mr-2" />
              Enviar Documento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="relative" onClick={() => goTo("/plano-acao")}>
          <Bell className="h-4 w-4" />
          {tasks.filter((task) => task.status !== "done").length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive px-1 text-xs text-destructive-foreground flex items-center justify-center">
              <AlertCircle className="h-3 w-3" />
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">{userInitial}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <ClientDialog open={clientDialogOpen} onOpenChange={setClientDialogOpen} />
    <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
    <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
    <MeetingDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} />
    <LeadDialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen} />
    </>
  );
}
