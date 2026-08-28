import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { ProjectDialog } from "@/components/dialogs/ProjectDialog";
import { MeetingDialog } from "@/components/dialogs/MeetingDialog";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface SearchResult {
  id: string;
  label: string;
  description: string;
  route: string;
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const { clients, projects, diagnostics, clientsLoading, projectsLoading } = useData();
  const navigate = useNavigate();
  const searchInput = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const results = useMemo<SearchResult[]>(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return [];
    const clientResults = clients
      .filter((client) => [client.name, client.nomeFantasia, client.razaoSocial].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)))
      .map((client) => ({ id: client.id, label: client.nomeFantasia || client.razaoSocial || client.name, description: "Cliente", route: `/clientes/${client.id}` }));
    const projectResults = projects
      .filter((project) => [project.name, project.clientName].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)))
      .map((project) => ({ id: project.id, label: project.name, description: `Projeto · ${project.clientName}`, route: `/projetos/${project.id}` }));
    const diagnosticResults = diagnostics
      .filter((diagnostic) => [diagnostic.name, diagnostic.clientName, diagnostic.projectName].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)))
      .map((diagnostic) => ({ id: diagnostic.id, label: diagnostic.name, description: "Diagnóstico", route: `/diagnosticos/${diagnostic.id}` }));
    return [...clientResults, ...projectResults, ...diagnosticResults].slice(0, 10);
  }, [clients, diagnostics, projects, search]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        searchInput.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logout realizado com sucesso");
  };

  const selectResult = (result: SearchResult) => {
    setSearchOpen(false);
    setSearch("");
    navigate(result.route);
  };

  const userInitial = user?.user_metadata?.full_name?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || "U";
  const searching = clientsLoading || projectsLoading;

  return (
    <>
      <header className="min-h-14 border-b border-border bg-card flex items-center justify-between px-2 sm:px-4 gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <SidebarTrigger className="shrink-0" aria-label="Abrir menu lateral" />
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverAnchor asChild>
              <div className="relative min-w-0 flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  ref={searchInput}
                  type="search"
                  aria-label="Busca global"
                  placeholder="Buscar cliente, projeto..."
                  className="pl-9 bg-background w-full"
                  value={search}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && results[0]) selectResult(results[0]);
                    if (event.key === "Escape") setSearchOpen(false);
                  }}
                />
              </div>
            </PopoverAnchor>
            <PopoverContent align="start" className="w-[min(28rem,calc(100vw-1rem))] p-1" onOpenAutoFocus={(event) => event.preventDefault()}>
              {!search.trim() ? (
                <p className="p-3 text-sm text-muted-foreground">Digite para pesquisar recursos permitidos. Atalho: /</p>
              ) : searching ? (
                <div className="p-3 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Pesquisando...</div>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
              ) : (
                <ul aria-label="Resultados da busca">
                  {results.map((result) => (
                    <li key={`${result.description}-${result.id}`}>
                      <button type="button" className="w-full rounded-sm px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => selectResult(result)}>
                        <span className="block text-sm font-medium">{result.label}</span>
                        <span className="block text-xs text-muted-foreground">{result.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" aria-label="Abrir ações rápidas">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ação rápida</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Criar</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setTaskOpen(true)}>Nova tarefa</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setClientOpen(true)}>Criar cliente</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setProjectOpen(true)}>Criar projeto</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMeetingOpen(true)}>Agendar reunião</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Registrar oportunidade · Em breve</DropdownMenuItem>
              <DropdownMenuItem disabled>Importar planilha · Em breve</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0" aria-label="Abrir menu da conta">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">{userInitial}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <ClientDialog open={clientOpen} onOpenChange={setClientOpen} />
      <ProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
      <MeetingDialog open={meetingOpen} onOpenChange={setMeetingOpen} />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
    </>
  );
}
