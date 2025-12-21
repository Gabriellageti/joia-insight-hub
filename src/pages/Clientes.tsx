import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Pencil, Plus, Search, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";

const followUpLabels = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

export default function Clientes() {
  const { clients, deleteClient } = useData();
  const [search, setSearch] = useState("");
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
    const term = search.toLowerCase();
    if (!term) return clients;

    return clients.filter((client) =>
      [
        client.razaoSocial,
        client.nomeFantasia,
        client.cnpj,
        client.segmentoTags.join(" "),
        client.endereco?.cidade,
        client.endereco?.uf,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [clients, search]);

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
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
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
    </div>
  );
}
