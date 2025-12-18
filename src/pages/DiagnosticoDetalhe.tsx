import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/contexts/DataContext";
import { formatRelativeUpdate, resolveStatusLabel } from "@/lib/diagnostics";

export default function DiagnosticoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { diagnostics } = useData();

  const diagnostic = useMemo(() => diagnostics.find((item) => item.id === id), [diagnostics, id]);

  if (!diagnostic) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-lg font-semibold">Diagnóstico não encontrado</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Diagnóstico</p>
          <h1 className="text-2xl font-semibold">{diagnostic.name}</h1>
          <p className="text-muted-foreground">{diagnostic.projectName} • {diagnostic.clientName}</p>
        </div>
        <Badge variant="outline">{resolveStatusLabel(diagnostic.status)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardDescription>Área placeholder para execução e resultados do diagnóstico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Responsável: {diagnostic.responsibleName || "Não definido"}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{formatRelativeUpdate(diagnostic)}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso</span>
              <span className="font-medium">{diagnostic.progress}%</span>
            </div>
            <Progress value={diagnostic.progress} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">Template: {diagnostic.templateName}</Badge>
            {diagnostic.dueDate && <Badge variant="outline">Data alvo: {diagnostic.dueDate}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => navigate(-1)}>
        Voltar
      </Button>
    </div>
  );
}
