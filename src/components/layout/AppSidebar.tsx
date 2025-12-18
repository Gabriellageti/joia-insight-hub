import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  ClipboardCheck, 
  ListTodo, 
  BarChart3, 
  Calendar, 
  FileText, 
  BookOpen, 
  UserCog, 
  DollarSign, 
  Megaphone,
  Settings,
  ChevronDown,
  Shapes
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Projetos", url: "/projetos", icon: FolderKanban },
  { title: "Diagnóstico", url: "/diagnostico", icon: ClipboardCheck },
  { title: "Templates", url: "/templates", icon: Shapes },
  { title: "Plano de Ação", url: "/plano-acao", icon: ListTodo },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3 },
  { title: "Reuniões", url: "/reunioes", icon: Calendar },
  { title: "Documentos", url: "/documentos", icon: FileText },
];

const managementNavItems = [
  { title: "Playbooks", url: "/playbooks", icon: BookOpen },
  { title: "Equipe", url: "/equipe", icon: UserCog },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
];

export function AppSidebar() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-sm">J</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground">JoIA Ops</h1>
            <p className="text-xs text-muted-foreground">Gestão Empresarial</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center justify-between hover:text-foreground">
                Gestão JoIA
                <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managementNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/configuracoes")}>
              <NavLink to="/configuracoes" className="flex items-center gap-3">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
