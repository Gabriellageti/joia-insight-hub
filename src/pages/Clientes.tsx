import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Route, Search, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const followUpLabels = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

export default function Clientes() {
  const { clients, deleteClient } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<typeof clients[number] | null>(null);
  const [clientToDelete, setClientToDelete] = useState<typeof clients[number] | null>(null);

  const handleEdit = (clientId: string) => {
    const client = clients.find((item) => item.id === clientId) || null;
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      await deleteClient(clientToDelete.id);
      toast.success("Cliente excluído com sucesso");
      setClientToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível excluir o cliente");
    }
  };

  const segmentOptions = useMemo(() => {
    const segments = new Set<string>();
    clients.forEach((client) => client.segmentoTags?.forEach((tag) => segments.add(tag)));
    return Array.from(segments).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    const term = search.toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !term ||
        [
          client.razaoSocial,
          client.nomeFantasia,
          client.cnpj,
          client.segmentoTags.join(" "),
          client.endereco?.cidade,
          client.endereco?.uf,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesSegment = segmentFilter === "all" || client.segmentoTags.includes(segmentFilter);
      return matchesSearch && matchesStatus && matchesSegment;
    });
  }, [clients, search, statusFilter, segmentFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie o pipeline e os relacionamentos com clientes</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por razão social, fantasia, CNPJ ou cidade..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos segmentos</SelectItem>
                {segmentOptions.map((segment) => (
                  <SelectItem key={segment} value={segment}>
                    {segment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhum cliente encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Contato principal</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <Link to={`/clientes/${client.id}`} className="hover:underline">
                          {client.nomeFantasia || client.razaoSocial}
                        </Link>
                        <span className="text-sm text-muted-foreground">{client.razaoSocial}</span>
                        {client.cnpj && (
                          <span className="text-xs text-muted-foreground">CNPJ: {client.cnpj}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {client.segmentoTags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {client.segmentoTags.map((tag, index) => (
                            <Badge key={`${client.id}-segment-${index}`} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>
                          {[client.endereco?.cidade, client.endereco?.uf].filter(Boolean).join(" - ") || "-"}
                        </span>
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
                        {client.contatoPrincipal?.whatsapp && (
                          <span className="text-xs text-muted-foreground">{client.contatoPrincipal.whatsapp}</span>
                        )}
                        {client.contatoPrincipal?.email && (
                          <span className="text-xs text-muted-foreground">{client.contatoPrincipal.email}</span>
                        )}
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

                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" asChild aria-label="Ver jornada do cliente">
                        <Link to={`/clientes/${client.id}/jornada`}>
                          <Route className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(client.id)} aria-label="Editar cliente">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setClientToDelete(client)}
                        aria-label="Excluir cliente"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedClient(null);
          }
          setDialogOpen(open);
        }}
        client={selectedClient || undefined}
      />

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove {clientToDelete?.nomeFantasia || clientToDelete?.razaoSocial || "o cliente"} do cadastro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
