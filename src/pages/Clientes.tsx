import { useState } from "react";
import { Plus, Search, Filter, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/contexts/DataContext";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { Client } from "@/types";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const riskColors = { low: "bg-green-500/10 text-green-700", medium: "bg-yellow-500/10 text-yellow-700", high: "bg-red-500/10 text-red-700" };
const riskLabels = { low: "Baixo", medium: "Médio", high: "Alto" };
const followUpLabels = { semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal" };

export default function Clientes() {
  const { clients, deleteClient } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const searchTerm = search.toLowerCase();
  const filteredClients = clients.filter((client) => {
    const normalizedCnpj = client.cnpj?.replace(/\D/g, "") || "";
    const terms = [
      client.nomeFantasia,
      client.razaoSocial,
      client.cnpj,
      normalizedCnpj,
      client.contatoPrincipal?.nome,
      client.endereco?.cidade,
      client.endereco?.uf,
      client.segmentoTags?.join(" "),
    ];
    return terms.some((term) => term?.toLowerCase().includes(searchTerm));
  });

  const handleEdit = (client: Client) => { setEditingClient(client); setDialogOpen(true); };
  const handleDelete = () => { if (deleteId) { deleteClient(deleteId); toast.success("Cliente excluído"); setDeleteId(null); } };
  const handleOpenExistingClient = (selectedClient: Client) => { setEditingClient(selectedClient); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-foreground">Clientes</h1><p className="text-muted-foreground">Gerencie sua carteira de clientes</p></div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditingClient(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Segmentos</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Relacionamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>NPS</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Último Contato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span>{client.nomeFantasia || client.razaoSocial}</span>
                      <span className="text-sm text-muted-foreground">{client.razaoSocial}</span>
                      {client.cnpj && <span className="text-xs text-muted-foreground">CNPJ: {client.cnpj}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.segmentoTags?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {client.segmentoTags.map((tag, index) => (
                          <Badge key={`${client.id}-segment-${index}`} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{[client.endereco?.cidade, client.endereco?.uf].filter(Boolean).join(" - ") || "-"}</span>
                      {client.endereco?.logradouro && (
                        <span className="text-xs text-muted-foreground">
                          {[client.endereco.logradouro, client.endereco.numero].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{client.contatoPrincipal?.nome || "-"}</span>
                      {client.contatoPrincipal?.whatsapp && <span className="text-xs text-muted-foreground">{client.contatoPrincipal.whatsapp}</span>}
                      {client.contatoPrincipal?.email && <span className="text-xs text-muted-foreground">{client.contatoPrincipal.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{client.preferenciasRelacionamento?.diaReuniao || "-"}</span>
                      {client.preferenciasRelacionamento?.frequencia && (
                        <span className="text-xs text-muted-foreground">
                          Frequência: {followUpLabels[client.preferenciasRelacionamento.frequencia]}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={client.status === "ativo" ? "default" : "secondary"}>{client.status === "ativo" ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>{client.projects}</TableCell>
                  <TableCell><span className={client.nps >= 8 ? "text-green-600 font-medium" : client.nps >= 6 ? "text-yellow-600" : "text-red-600"}>{client.nps}</span></TableCell>
                  <TableCell><Badge className={riskColors[client.risk]} variant="outline">{riskLabels[client.risk]}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{client.lastContact}</TableCell>
                  <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleEdit(client)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(client.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editingClient} onOpenExistingClient={handleOpenExistingClient} />
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este cliente?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
