import { useState } from "react";
import { Plus, FileSearch, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/contexts/DataContext";
import { DiagnosticDialog } from "@/components/dialogs/DiagnosticDialog";
import { Diagnostic } from "@/types";

const statusConfig = { draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock }, in_progress: { label: "Em Andamento", color: "bg-yellow-100 text-yellow-700", icon: FileSearch }, completed: { label: "Concluído", color: "bg-green-100 text-green-700", icon: CheckCircle2 } };
const templates = [{ id: "1", name: "Diagnóstico Completo JoIA", sections: 7, questions: 85 }, { id: "2", name: "Diagnóstico de Compras", sections: 3, questions: 28 }, { id: "3", name: "Diagnóstico de Estoque", sections: 3, questions: 24 }, { id: "4", name: "Diagnóstico Financeiro", sections: 4, questions: 32 }];

export default function Diagnostico() {
  const { diagnostics } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiagnostic, setEditingDiagnostic] = useState<Diagnostic | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-foreground">Diagnóstico JoIA</h1><p className="text-muted-foreground">Aplique diagnósticos padronizados e identifique oportunidades</p></div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingDiagnostic(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Diagnóstico</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-medium">Diagnósticos Aplicados</h2>
          {diagnostics.map((diagnostic) => {
            const status = statusConfig[diagnostic.status]; const Icon = status.icon;
            return (
              <Card key={diagnostic.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditingDiagnostic(diagnostic); setDialogOpen(true); }}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4"><div><h3 className="font-semibold">{diagnostic.projectName}</h3><p className="text-sm text-muted-foreground">{diagnostic.clientName}</p></div><Badge className={status.color} variant="outline"><Icon className="h-3 w-3 mr-1" />{status.label}</Badge></div>
                  <p className="text-sm text-muted-foreground mb-3">{diagnostic.templateName}</p>
                  {diagnostic.status !== "draft" && <div className="space-y-2 mb-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Progresso</span><span>{diagnostic.progress}%</span></div><Progress value={diagnostic.progress} className="h-2" /></div>}
                  <div className="flex items-center justify-between text-sm">{diagnostic.score !== undefined && <div><span className="text-muted-foreground">Score: </span><span className={`font-semibold ${diagnostic.score >= 70 ? "text-green-600" : diagnostic.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>{diagnostic.score}/100</span></div>}<div><span className="text-muted-foreground">Oportunidades: </span><span className="font-semibold text-accent">{diagnostic.opportunities}</span></div><span className="text-muted-foreground">{diagnostic.createdAt}</span></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Templates Disponíveis</h2>
          {templates.map((template) => (<Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-4"><h4 className="font-medium mb-2">{template.name}</h4><div className="flex items-center gap-4 text-sm text-muted-foreground"><span>{template.sections} seções</span><span>{template.questions} perguntas</span></div></CardContent></Card>))}
        </div>
      </div>
      <DiagnosticDialog open={dialogOpen} onOpenChange={setDialogOpen} diagnostic={editingDiagnostic} />
    </div>
  );
}
