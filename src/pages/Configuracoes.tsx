import { Building2, Users, Bell, Shield, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { UserAccessManager } from "@/components/settings/UserAccessManager";

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie workspaces, permissões e preferências</p>
      </div>

      <Tabs defaultValue="workspace" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workspace">
            <Building2 className="h-4 w-4 mr-2" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Aparência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Workspace</CardTitle>
              <CardDescription>Configure as informações básicas do seu workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Nome do Workspace</Label>
                <Input id="workspace-name" defaultValue="JoIA Soluções Empresariais" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-slug">URL do Workspace</Label>
                <Input id="workspace-slug" defaultValue="joia-solucoes" />
              </div>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Usuários</CardTitle>
              <CardDescription>Adicione e gerencie membros do workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <UserAccessManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Segurança e Acesso</CardTitle>
              <CardDescription>Configure políticas de segurança</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Administradores têm acesso à Gestão JoIA. Colaboradores trabalham nos projetos e planos de ação, sem acesso a Playbooks, Equipe, Financeiro, Marketing ou Configurações.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize a aparência da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Modo Escuro</p>
                  <p className="text-sm text-muted-foreground">Alternar entre tema claro e escuro</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sidebar Compacta</p>
                  <p className="text-sm text-muted-foreground">Reduzir largura da navegação lateral</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
