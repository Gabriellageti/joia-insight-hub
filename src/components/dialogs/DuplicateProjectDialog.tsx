import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/contexts/DataContext";
import { duplicateProject } from "@/lib/project-templates";
import { Project } from "@/types";

interface Props { project: Project | null; open: boolean; onOpenChange: (open: boolean) => void; }
const today = () => new Date().toISOString().slice(0, 10);

export function DuplicateProjectDialog({ project, open, onOpenChange }: Props) {
  const { clients } = useData();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({ copyTasks: true, copyStages: true, copyDocuments: true, copyAssignees: true, copySettings: true });
  useEffect(() => { if (open && project) { setName(`${project.name} — Cópia`); setClientId(project.clientId); setStartDate(today()); } }, [open, project]);
  if (!project) return null;
  const submit = async () => {
    if (!name.trim() || !clientId || !startDate) { toast.error("Informe nome, cliente e data inicial."); return; }
    setSaving(true);
    try {
      const id = await duplicateProject({ sourceProjectId: project.id, name: name.trim(), clientId, startDate, ...options });
      toast.success("Projeto duplicado com sucesso."); onOpenChange(false);
      window.location.assign(`/projetos/${id}`);
    } catch (error) { toast.error((error as Error).message); setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Duplicar projeto</DialogTitle><DialogDescription>Os documentos são vinculados por referência; nenhum arquivo físico será copiado.</DialogDescription></DialogHeader>
    <div className="space-y-4"><div className="space-y-2"><Label htmlFor="duplicate-name">Nome</Label><Input id="duplicate-name" value={name} onChange={(event) => setName(event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Cliente</Label><Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.nomeFantasia || client.razaoSocial}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="duplicate-start">Data inicial</Label><Input id="duplicate-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div></div>
      <fieldset className="space-y-3 rounded-lg border p-4"><legend className="px-1 text-sm font-medium">Copiar estrutura</legend>{([['copyTasks','Tarefas e checklists'],['copyStages','Etapas'],['copyDocuments','Documentos estruturais'],['copyAssignees','Responsáveis'],['copySettings','Configurações do projeto']] as const).map(([key,label]) => <div key={key} className="flex items-center justify-between gap-3"><Label htmlFor={key}>{label}</Label><Switch id={key} checked={options[key]} onCheckedChange={(checked) => setOptions((current) => ({ ...current, [key]: checked }))} /></div>)}</fieldset>
    </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={() => void submit()} disabled={saving}><Copy className="mr-2 h-4 w-4" />{saving ? "Duplicando…" : "Duplicar projeto"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
