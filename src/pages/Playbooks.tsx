import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search, BookOpen, FileText, CheckSquare, Plus, UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useData } from "@/contexts/DataContext";
import { Playbook } from "@/types";

interface Template {
  id: string;
  name: string;
  type: string;
  downloads: number;
}

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
  const { playbooks, addPlaybook } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(playbooks[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: "",
    area: "",
    description: "",
    whenToUse: "",
    howToValidate: "",
    steps: "",
    checklist: "",
    commonErrors: "",
    tags: "",
  });

  const [uploadForm, setUploadForm] = useState({
    title: "",
    area: "",
    description: "",
    whenToUse: "",
    howToValidate: "",
    tags: "",
    file: null as File | null,
  });

  useEffect(() => {
    if (!selectedId && playbooks.length > 0) {
      setSelectedId(playbooks[0].id);
    }
  }, [playbooks, selectedId]);

  const filteredPlaybooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return playbooks;
    return playbooks.filter((playbook) => {
      const searchable = [
        playbook.title,
        playbook.area,
        playbook.description,
        playbook.whenToUse,
        playbook.howToValidate,
        ...playbook.tags,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [playbooks, searchTerm]);

  const selectedPlaybook = playbooks.find((playbook) => playbook.id === selectedId) ?? filteredPlaybooks[0] ?? null;

  const areaOptions = useMemo(() => {
    const baseAreas = ["Diagnóstico", "Plano de Ação", "Indicadores", "Estoque", "Operações", "Financeiro"];
    const dataAreas = playbooks.map((playbook) => playbook.area);
    return Array.from(new Set([...baseAreas, ...dataAreas])).filter(Boolean);
  }, [playbooks]);

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const resetCreateForm = () => {
    setCreateForm({
      title: "",
      area: "",
      description: "",
      whenToUse: "",
      howToValidate: "",
      steps: "",
      checklist: "",
      commonErrors: "",
      tags: "",
    });
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: "",
      area: "",
      description: "",
      whenToUse: "",
      howToValidate: "",
      tags: "",
      file: null,
    });
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.title || !createForm.area) return;
    addPlaybook({
      title: createForm.title,
      area: createForm.area,
      description: createForm.description,
      whenToUse: createForm.whenToUse,
      howToValidate: createForm.howToValidate,
      steps: parseList(createForm.steps),
      checklist: parseList(createForm.checklist),
      commonErrors: parseList(createForm.commonErrors),
      tags: parseList(createForm.tags),
    });
    resetCreateForm();
    setCreateOpen(false);
  };

  const handleUploadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadForm.title || !uploadForm.area || !uploadForm.file) return;
    addPlaybook({
      title: uploadForm.title,
      area: uploadForm.area,
      description: uploadForm.description,
      whenToUse: uploadForm.whenToUse,
      howToValidate: uploadForm.howToValidate,
      steps: [],
      checklist: [],
      commonErrors: [],
      tags: parseList(uploadForm.tags),
      fileName: uploadForm.file.name,
      fileType: uploadForm.file.type,
      fileSize: uploadForm.file.size,
    });
    resetUploadForm();
    setUploadOpen(false);
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const handleOpenUpload = () => {
    resetUploadForm();
    setUploadOpen(true);
  };

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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar playbook..."
                className="pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar playbook
              </Button>
              <Button variant="outline" onClick={handleOpenUpload}>
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload playbook
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">{filteredPlaybooks.length} playbooks encontrados</div>
              {filteredPlaybooks.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Nenhum playbook encontrado. Ajuste sua busca ou crie um novo.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredPlaybooks.map((playbook) => (
                    <Card
                      key={playbook.id}
                      className={`hover:shadow-md transition-shadow cursor-pointer ${
                        selectedPlaybook?.id === playbook.id ? "border-primary" : ""
                      }`}
                      onClick={() => setSelectedId(playbook.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-lg">{playbook.title}</CardTitle>
                          <Badge className={areaColors[playbook.area] ?? "bg-muted text-muted-foreground"} variant="outline">
                            {playbook.area}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{playbook.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{playbook.steps.length} passos</span>
                          <span>•</span>
                          <span>{playbook.checklist.length} checks</span>
                          <span>•</span>
                          <span>Criado em {playbook.createdAt}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{selectedPlaybook?.title ?? "Selecione um playbook"}</CardTitle>
                    {selectedPlaybook?.area && (
                      <Badge className={areaColors[selectedPlaybook.area] ?? "bg-muted text-muted-foreground"} variant="outline">
                        {selectedPlaybook.area}
                      </Badge>
                    )}
                  </div>
                  {selectedPlaybook?.description && (
                    <p className="text-sm text-muted-foreground">{selectedPlaybook.description}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedPlaybook ? (
                  <p className="text-sm text-muted-foreground">Selecione um playbook para visualizar os detalhes.</p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Quando usar</p>
                        <p className="text-sm">{selectedPlaybook.whenToUse || "Não informado"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Como validar</p>
                        <p className="text-sm">{selectedPlaybook.howToValidate || "Não informado"}</p>
                      </div>
                    </div>
                    {selectedPlaybook.fileName && (
                      <div className="rounded-md border border-dashed border-border p-3 text-sm">
                        <p className="text-xs uppercase text-muted-foreground">Arquivo enviado</p>
                        <p className="font-medium">{selectedPlaybook.fileName}</p>
                        {selectedPlaybook.fileType && (
                          <p className="text-xs text-muted-foreground">{selectedPlaybook.fileType}</p>
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Passos</p>
                      {selectedPlaybook.steps.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum passo detalhado.</p>
                      ) : (
                        <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                          {selectedPlaybook.steps.map((step, index) => (
                            <li key={`${step}-${index}`}>{step}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Checklist</p>
                      {selectedPlaybook.checklist.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Checklist não informado.</p>
                      ) : (
                        <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                          {selectedPlaybook.checklist.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Erros comuns</p>
                      {selectedPlaybook.commonErrors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma observação registrada.</p>
                      ) : (
                        <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                          {selectedPlaybook.commonErrors.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Tags</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedPlaybook.tags.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Sem tags</span>
                        ) : (
                          selectedPlaybook.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar playbook</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={createForm.title}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex: Diagnóstico JoIA"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Área</label>
                <Input
                  value={createForm.area}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, area: event.target.value }))}
                  placeholder="Ex: Diagnóstico"
                  list="playbook-area-options"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={createForm.description}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Resumo do playbook"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quando usar</label>
                <Textarea
                  value={createForm.whenToUse}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, whenToUse: event.target.value }))}
                  placeholder="Momento ideal do projeto"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Como validar</label>
                <Textarea
                  value={createForm.howToValidate}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, howToValidate: event.target.value }))}
                  placeholder="Evidências ou critérios"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Passos (separados por vírgula)</label>
              <Textarea
                value={createForm.steps}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, steps: event.target.value }))}
                placeholder="Ex: Preparar entrevistas, Rodar entrevistas, Consolidar achados"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Checklist (separado por vírgula)</label>
              <Textarea
                value={createForm.checklist}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, checklist: event.target.value }))}
                placeholder="Ex: Dados coletados, Hipóteses aprovadas"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Erros comuns (separados por vírgula)</label>
              <Textarea
                value={createForm.commonErrors}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, commonErrors: event.target.value }))}
                placeholder="Ex: Não registrar evidências"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (separadas por vírgula)</label>
              <Input
                value={createForm.tags}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="diagnóstico, discovery"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar playbook</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload de playbook</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUploadSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={uploadForm.title}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Nome do playbook"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Área</label>
                <Input
                  value={uploadForm.area}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, area: event.target.value }))}
                  placeholder="Ex: Operações"
                  list="playbook-area-options"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resumo</label>
              <Textarea
                value={uploadForm.description}
                onChange={(event) => setUploadForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Objetivo do playbook"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quando usar</label>
                <Textarea
                  value={uploadForm.whenToUse}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, whenToUse: event.target.value }))}
                  placeholder="Momento de aplicação"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Como validar</label>
                <Textarea
                  value={uploadForm.howToValidate}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, howToValidate: event.target.value }))}
                  placeholder="Critérios de sucesso"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (separadas por vírgula)</label>
              <Input
                value={uploadForm.tags}
                onChange={(event) => setUploadForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="processo, operação"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Arquivo</label>
              <Input
                type="file"
                onChange={(event) => setUploadForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
                required
              />
              <p className="text-xs text-muted-foreground">Envie PDF, DOCX ou PPTX do playbook.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar upload</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <datalist id="playbook-area-options">
        {areaOptions.map((area) => (
          <option key={area} value={area} />
        ))}
      </datalist>
    </div>
  );
}
