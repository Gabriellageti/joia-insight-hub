import { useState } from "react";
import { Upload, Folder, FileText, Search, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  project: string;
  client: string;
  uploadedAt: string;
  size: string;
}

const categories = [
  { id: "contracts", name: "Contratos e Propostas", count: 12 },
  { id: "diagnostics", name: "Diagnósticos", count: 8 },
  { id: "indicators", name: "Indicadores", count: 24 },
  { id: "evidence", name: "Evidências de Execução", count: 45 },
  { id: "meetings", name: "Reuniões e Atas", count: 18 },
  { id: "processes", name: "Processos e POPs", count: 15 },
  { id: "training", name: "Materiais de Treinamento", count: 9 },
];

const mockDocuments: Document[] = [
  { id: "1", name: "Contrato_EmpresaABC_2024.pdf", type: "pdf", category: "contracts", project: "Otimização de Compras", client: "Empresa ABC", uploadedAt: "10/12/2024", size: "245 KB" },
  { id: "2", name: "Diagnóstico_Compras_Final.xlsx", type: "xlsx", category: "diagnostics", project: "Otimização de Compras", client: "Empresa ABC", uploadedAt: "15/11/2024", size: "1.2 MB" },
  { id: "3", name: "Indicadores_Novembro.xlsx", type: "xlsx", category: "indicators", project: "Gestão de Estoque", client: "Indústria XYZ", uploadedAt: "01/12/2024", size: "890 KB" },
  { id: "4", name: "Ata_Reuniao_16Dez.docx", type: "docx", category: "meetings", project: "Processos de Vendas", client: "Serviços JKL", uploadedAt: "16/12/2024", size: "156 KB" },
];

const typeIcons: Record<string, string> = {
  pdf: "text-red-500",
  xlsx: "text-green-500",
  docx: "text-blue-500",
};

export default function Documentos() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredDocs = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documentos e Evidências</h1>
          <p className="text-muted-foreground">Organize e acesse arquivos dos projetos</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <h3 className="font-medium text-sm mb-3">Categorias</h3>
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSelectedCategory(null)}
          >
            <Folder className="h-4 w-4 mr-2" />
            Todos
            <Badge variant="outline" className="ml-auto">{mockDocuments.length}</Badge>
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedCategory(category.id)}
            >
              <Folder className="h-4 w-4 mr-2" />
              <span className="truncate flex-1 text-left">{category.name}</span>
              <Badge variant="outline" className="ml-2">{category.count}</Badge>
            </Button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar documento..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Grid className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <List className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`p-2 rounded ${typeIcons[doc.type] || "text-muted-foreground"} bg-muted`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                    <p className="text-xs text-muted-foreground">{doc.project}</p>
                    <p className="text-xs text-muted-foreground">{doc.client}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{doc.uploadedAt}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
