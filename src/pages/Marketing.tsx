import { useState } from "react";
import { Plus, Users, FileText, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/contexts/DataContext";
import { LeadDialog } from "@/components/dialogs/LeadDialog";
import { ContentItem, Lead } from "@/types";

const statusConfig: Record<Lead["status"], { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-blue-100 text-blue-700" },
  contacted: { label: "Contatado", color: "bg-purple-100 text-purple-700" },
  meeting: { label: "Reunião", color: "bg-yellow-100 text-yellow-700" },
  proposal: { label: "Proposta", color: "bg-orange-100 text-orange-700" },
  won: { label: "Ganho", color: "bg-green-100 text-green-700" },
  lost: { label: "Perdido", color: "bg-red-100 text-red-700" },
};

const contentStatusConfig: Record<ContentItem["status"], { label: string; color: string }> = {
  idea: { label: "Ideia", color: "bg-gray-100 text-gray-700" },
  draft: { label: "Rascunho", color: "bg-yellow-100 text-yellow-700" },
  review: { label: "Revisão", color: "bg-purple-100 text-purple-700" },
  published: { label: "Publicado", color: "bg-green-100 text-green-700" },
};
const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

export default function Marketing() {
  const { leads, contentItems } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const totalPipeline = leads.filter(l => !["won", "lost"].includes(l.status)).reduce((sum, l) => sum + l.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-foreground">Marketing e Comercial</h1><p className="text-muted-foreground">CRM, propostas e calendário de conteúdo</p></div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingLead(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Lead</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{leads.length}</p><p className="text-sm text-muted-foreground">Leads ativos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{leads.filter(l => l.status === "proposal").length}</p><p className="text-sm text-muted-foreground">Propostas enviadas</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-accent">{formatCurrency(totalPipeline)}</p><p className="text-sm text-muted-foreground">Pipeline</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">35%</p><p className="text-sm text-muted-foreground">Taxa de conversão</p></CardContent></Card>
      </div>
      <Tabs defaultValue="crm">
        <TabsList><TabsTrigger value="crm"><Users className="h-4 w-4 mr-2" />CRM</TabsTrigger><TabsTrigger value="proposals"><FileText className="h-4 w-4 mr-2" />Propostas</TabsTrigger><TabsTrigger value="content"><CalendarIcon className="h-4 w-4 mr-2" />Conteúdo</TabsTrigger></TabsList>
        <TabsContent value="crm" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditingLead(lead); setDialogOpen(true); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2"><div><h3 className="font-semibold">{lead.company}</h3><p className="text-sm text-muted-foreground">{lead.contact}</p></div><Badge className={statusConfig[lead.status].color} variant="outline">{statusConfig[lead.status].label}</Badge></div>
                  <div className="flex items-center justify-between text-sm mt-3"><span className="text-muted-foreground">Fonte: {lead.source}</span><span className="font-semibold text-accent">{formatCurrency(lead.value)}</span></div>
                  <p className="text-xs text-muted-foreground mt-2">Próxima ação: {lead.nextAction}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="proposals" className="mt-4"><Card><CardContent className="p-6 text-center text-muted-foreground">Biblioteca de propostas em desenvolvimento...</CardContent></Card></TabsContent>
        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Calendário Editorial</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contentItems.map((item) => {
                  const status = contentStatusConfig[item.status];
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <Badge variant="outline" className="mt-1 text-xs">{item.type}</Badge>
                      </div>
                      <Badge className={status?.color || "bg-muted"} variant="outline">
                        {status?.label || item.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editingLead} />
    </div>
  );
}
