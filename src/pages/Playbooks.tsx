import { Search, BookOpen, FileText, CheckSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Playbook {
  id: string;
  title: string;
  area: string;
  description: string;
  steps: number;
  readTime: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  downloads: number;
}

const playbooks: Playbook[] = [
  { id: "1", title: "Como rodar o Diagnóstico JoIA", area: "Diagnóstico", description: "Guia completo para aplicar o diagnóstico padronizado em novos clientes", steps: 12, readTime: "15 min" },
  { id: "2", title: "Como transformar achados em plano de ação", area: "Plano de Ação", description: "Metodologia para priorizar e converter oportunidades em tarefas executáveis", steps: 8, readTime: "10 min" },
  { id: "3", title: "Como provar valor com indicadores", area: "Indicadores", description: "Framework para definir, coletar e apresentar KPIs que demonstram resultados", steps: 10, readTime: "12 min" },
  { id: "4", title: "Como implantar curva ABC", area: "Estoque", description: "Passo a passo para classificar e otimizar gestão de estoque", steps: 15, readTime: "20 min" },
];

const templates: Template[] = [
  { id: "1", name: "Template de Ata de Reunião", type: "docx", downloads: 45 },
  { id: "2", name: "Template de Relatório Executivo", type: "pptx", downloads: 38 },
  { id: "3", name: "Template de Plano de Ação 5W2H", type: "xlsx", downloads: 52 },
  { id: "4", name: "Checklist de Diagnóstico Compras", type: "xlsx", downloads: 29 },
];

const areaColors: Record<string, string> = {
  "Diagnóstico": "bg-blue-100 text-blue-700",
  "Plano de Ação": "bg-purple-100 text-purple-700",
  "Indicadores": "bg-green-100 text-green-700",
  "Estoque": "bg-orange-100 text-orange-700",
};

export default function Playbooks() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Playbooks e Processos</h1>
        <p className="text-muted-foreground">Base de conhecimento JoIA para padronizar a execução</p>
      </div>

      <Tabs defaultValue="playbooks">
        <TabsList>
          <TabsTrigger value="playbooks">
            <BookOpen className="h-4 w-4 mr-2" />
            Playbooks
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="checklists">
            <CheckSquare className="h-4 w-4 mr-2" />
            Checklists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playbooks" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar playbook..." className="pl-9" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playbooks.map((playbook) => (
              <Card key={playbook.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{playbook.title}</CardTitle>
                    <Badge className={areaColors[playbook.area]} variant="outline">
                      {playbook.area}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{playbook.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{playbook.steps} passos</span>
                    <span>•</span>
                    <span>{playbook.readTime} de leitura</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                  <p className="text-xs text-muted-foreground">{template.downloads} downloads</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="checklists" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Checklists de procedimentos em desenvolvimento...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
