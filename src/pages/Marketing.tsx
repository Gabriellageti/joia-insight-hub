import { Plus, Users, FileText, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Lead {
  id: string;
  company: string;
  contact: string;
  source: string;
  status: "new" | "contacted" | "meeting" | "proposal" | "won" | "lost";
  value: number;
  nextAction: string;
}

const leads: Lead[] = [
  { id: "1", company: "Tech Solutions", contact: "Roberto Almeida", source: "LinkedIn", status: "proposal", value: 15000, nextAction: "Aguardando retorno" },
  { id: "2", company: "Distribuidora Norte", contact: "Patrícia Lima", source: "Indicação", status: "meeting", value: 22000, nextAction: "Reunião 20/12" },
  { id: "3", company: "Indústria Sul", contact: "Fernando Costa", source: "Site", status: "contacted", value: 18000, nextAction: "Ligar amanhã" },
  { id: "4", company: "Comércio Central", contact: "Amanda Silva", source: "Evento", status: "new", value: 12000, nextAction: "Primeiro contato" },
];

const statusConfig = {
  new: { label: "Novo", color: "bg-blue-100 text-blue-700" },
  contacted: { label: "Contatado", color: "bg-purple-100 text-purple-700" },
  meeting: { label: "Reunião", color: "bg-yellow-100 text-yellow-700" },
  proposal: { label: "Proposta", color: "bg-orange-100 text-orange-700" },
  won: { label: "Ganho", color: "bg-green-100 text-green-700" },
  lost: { label: "Perdido", color: "bg-red-100 text-red-700" },
};

const contentItems = [
  { id: "1", title: "Como reduzir custos de compras em 30 dias", status: "published", type: "Artigo" },
  { id: "2", title: "Case: Empresa ABC economiza R$ 200k", status: "review", type: "Case" },
  { id: "3", title: "5 erros em gestão de estoque", status: "draft", type: "Post" },
  { id: "4", title: "Webinar: Diagnóstico empresarial", status: "idea", type: "Webinar" },
];

const contentStatusConfig = {
  idea: { label: "Ideia", color: "bg-gray-100 text-gray-700" },
  draft: { label: "Rascunho", color: "bg-yellow-100 text-yellow-700" },
  review: { label: "Revisão", color: "bg-purple-100 text-purple-700" },
  published: { label: "Publicado", color: "bg-green-100 text-green-700" },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);
};

export default function Marketing() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Marketing e Comercial</h1>
          <p className="text-muted-foreground">CRM, propostas e calendário de conteúdo</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">12</p>
            <p className="text-sm text-muted-foreground">Leads ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">4</p>
            <p className="text-sm text-muted-foreground">Propostas enviadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">R$ 67k</p>
            <p className="text-sm text-muted-foreground">Pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">35%</p>
            <p className="text-sm text-muted-foreground">Taxa de conversão</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="crm">
        <TabsList>
          <TabsTrigger value="crm">
            <Users className="h-4 w-4 mr-2" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="proposals">
            <FileText className="h-4 w-4 mr-2" />
            Propostas
          </TabsTrigger>
          <TabsTrigger value="content">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Conteúdo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crm" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{lead.company}</h3>
                      <p className="text-sm text-muted-foreground">{lead.contact}</p>
                    </div>
                    <Badge className={statusConfig[lead.status].color} variant="outline">
                      {statusConfig[lead.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-3">
                    <span className="text-muted-foreground">Fonte: {lead.source}</span>
                    <span className="font-semibold text-accent">{formatCurrency(lead.value)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Próxima ação: {lead.nextAction}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Biblioteca de propostas em desenvolvimento...
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendário Editorial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contentItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <Badge variant="outline" className="mt-1 text-xs">{item.type}</Badge>
                    </div>
                    <Badge className={(contentStatusConfig as any)[item.status]?.color || "bg-muted"} variant="outline">
                      {(contentStatusConfig as any)[item.status]?.label || item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
