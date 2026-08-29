import { useState } from "react";
import { Plus, Users, FileText, Calendar as CalendarIcon, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/contexts/DataContext";
import { LeadDialog } from "@/components/dialogs/LeadDialog";
import { ContentItemDialog } from "@/components/dialogs/ContentItemDialog";
import { ContentItem, Lead } from "@/types";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusConfig: Record<Lead["status"], { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  contacted: { label: "Contatado", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  meeting: { label: "Reunião", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  proposal: { label: "Proposta", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  won: { label: "Ganho", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  lost: { label: "Perdido", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const contentStatusConfig: Record<ContentItem["status"], { label: string; color: string }> = {
  idea: { label: "Ideia", color: "bg-muted text-muted-foreground" },
  draft: { label: "Rascunho", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  review: { label: "Revisão", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  published: { label: "Publicado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

export default function Marketing() {
  const { leads, contentItems, deleteLead, deleteContentItem } = useData();
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);

  const totalPipeline = leads.filter(l => !["won", "lost"].includes(l.status)).reduce((sum, l) => sum + l.value, 0);
  const proposalCount = leads.filter(l => l.status === "proposal").length;
  const wonCount = leads.filter(l => l.status === "won").length;
  const conversionRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;
    try {
      await deleteLead(deleteLeadId);
      toast.success("Lead removido com sucesso");
    } catch {
      toast.error("Erro ao remover lead");
    }
    setDeleteLeadId(null);
  };

  const handleDeleteContent = async () => {
    if (!deleteContentId) return;
    try {
      await deleteContentItem(deleteContentId);
      toast.success("Conteúdo removido com sucesso");
    } catch {
      toast.error("Erro ao remover conteúdo");
    }
    setDeleteContentId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Marketing e Comercial</h1>
          <p className="text-muted-foreground">CRM, propostas e calendário de conteúdo</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingLead(null); setLeadDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Lead
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{leads.length}</p>
            <p className="text-sm text-muted-foreground">Leads ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{proposalCount}</p>
            <p className="text-sm text-muted-foreground">Propostas enviadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">{formatCurrency(totalPipeline)}</p>
            <p className="text-sm text-muted-foreground">Pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-sm text-muted-foreground">Taxa de conversão</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="crm">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger className="shrink-0" value="crm"><Users className="h-4 w-4 mr-2" />CRM</TabsTrigger>
          <TabsTrigger className="shrink-0" value="proposals"><FileText className="h-4 w-4 mr-2" />Propostas</TabsTrigger>
          <TabsTrigger className="shrink-0" value="content"><CalendarIcon className="h-4 w-4 mr-2" />Conteúdo</TabsTrigger>
        </TabsList>

        <TabsContent value="crm" className="mt-4">
          {leads.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhum lead cadastrado. Clique em "Novo Lead" para adicionar.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leads.map((lead) => (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div 
                        className="flex-1 cursor-pointer" 
                        onClick={() => { setEditingLead(lead); setLeadDialogOpen(true); }}
                      >
                        <h3 className="font-semibold">{lead.company}</h3>
                        <p className="text-sm text-muted-foreground">{lead.contact}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusConfig[lead.status].color} variant="outline">
                          {statusConfig[lead.status].label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditingLead(lead); setLeadDialogOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteLeadId(lead.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-3">
                      <span className="text-muted-foreground">Fonte: {lead.source}</span>
                      <span className="font-semibold text-accent">{formatCurrency(lead.value)}</span>
                    </div>
                    {lead.nextAction && (
                      <p className="text-xs text-muted-foreground mt-2">Próxima ação: {lead.nextAction}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Calendário Editorial</CardTitle>
              <Button 
                size="sm" 
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => { setEditingContent(null); setContentDialogOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />Novo Conteúdo
              </Button>
            </CardHeader>
            <CardContent>
              {contentItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum conteúdo cadastrado. Clique em "Novo Conteúdo" para adicionar.
                </p>
              ) : (
                <div className="space-y-3">
                  {contentItems.map((item) => {
                    const status = contentStatusConfig[item.status];
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => { setEditingContent(item); setContentDialogOpen(true); }}
                        >
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{item.type}</Badge>
                            {item.publishDate && (
                              <span className="text-xs text-muted-foreground">{item.publishDate}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={status?.color || "bg-muted"} variant="outline">
                            {status?.label || item.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditingContent(item); setContentDialogOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteContentId(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LeadDialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen} lead={editingLead} />
      <ContentItemDialog open={contentDialogOpen} onOpenChange={setContentDialogOpen} contentItem={editingContent} />

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteContentId} onOpenChange={() => setDeleteContentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Conteúdo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este conteúdo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
