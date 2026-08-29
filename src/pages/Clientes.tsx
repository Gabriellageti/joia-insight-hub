import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Pencil, Plus, Route, Search, Trash, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterClients, type ClientRiskFilter, type ClientStatusFilter } from "@/lib/clients/filters";

const followUpLabels = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

const riskLabels = { low: "Risco baixo", medium: "Risco médio", high: "Risco alto" };
const riskClasses = {
  low: "border-green-500/30 text-green-700",
  medium: "border-amber-500/30 text-amber-700",
  high: "border-destructive/30 text-destructive",
};

export default function Clientes() {
  const { clients, clientsLoading, clientsError, deleteClient, projects } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("todos");
  const [riskFilter, setRiskFilter] = useState<ClientRiskFilter>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<typeof clients[number] | null>(null);

  const handleEdit = (clientId: string) => {
    const client = clients.find((item) => item.id === clientId) || null;
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    const client = clients.find((item) => item.id === clientId);
    const confirmed = window.confirm(
      `Deseja realmente excluir ${client?.nomeFantasia || client?.razaoSocial || "o cliente"}?`
    );

    if (!confirmed) return;

    try {
      await deleteClient(clientId);
      toast.success("Cliente excluído com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível excluir o cliente");
    }
  };

  const filteredClients = useMemo(() => {
    return filterClients(clients, { search, status: statusFilter, risk: riskFilter });
  }, [clients, riskFilter, search, statusFilter]);

  const projectCountByClient = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((project) => counts.set(project.clientId, (counts.get(project.clientId) || 0) + 1));
    return counts;
  }, [projects]);

  const hasActiveFilters = Boolean(search) || statusFilter !== "todos" || riskFilter !== "todos";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("todos");
    setRiskFilter("todos");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por razão social, fantasia, CNPJ ou cidade..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ClientStatusFilter)}>
              <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as ClientRiskFilter)}>
              <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Risco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os riscos</SelectItem>
                <SelectItem value="low">Risco baixo</SelectItem>
                <SelectItem value="medium">Risco médio</SelectItem>
                <SelectItem value="high">Risco alto</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="justify-start">
                <X className="mr-2 h-4 w-4" /> Limpar
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredClients.length} de {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {clientsLoading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando clientes...</div>
          ) : clientsError ? (
            <div className="py-10 text-center text-destructive">Não foi possível carregar os clientes: {clientsError}</div>
          ) : filteredClients.length === 0 ? (
            <div className="space-y-3 py-10 text-center text-muted-foreground">
              <p>{hasActiveFilters ? "Nenhum cliente corresponde aos filtros." : "Nenhum cliente cadastrado."}</p>
              {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato principal</TableHead>
                  <TableHead>Projetos</TableHead>
                  <TableHead>Situação</TableHead>
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
                        <span className="truncate text-xs text-muted-foreground">{client.razaoSocial}{client.cnpj ? ` · ${client.cnpj}` : ""}</span>
                        {client.segmentoTags?.[0] && <span className="text-xs text-muted-foreground">{client.segmentoTags[0]}</span>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{client.contatoPrincipal?.nome || "-"}</span>
                        <span className="text-xs text-muted-foreground">{client.contatoPrincipal?.whatsapp || client.contatoPrincipal?.email || "Sem contato informado"}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 text-sm"><FolderKanban className="h-4 w-4 text-muted-foreground" />{projectCountByClient.get(client.id) || 0}</div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={client.status === "ativo" ? "default" : "secondary"}>
                          {client.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge variant="outline" className={riskClasses[client.risk]}>
                          {riskLabels[client.risk]}
                        </Badge>
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
                        onClick={() => handleDelete(client.id)}
                        aria-label="Excluir cliente"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
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
    </div>
  );
}
