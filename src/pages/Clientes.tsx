import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { useData } from "@/contexts/DataContext";
import { Client } from "@/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { ClientDialog } from "@/components/ClientDialog";

const followUpLabels: Record<NonNullable<Client["preferenciasRelacionamento"]["frequencia"]>, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

export default function Clientes() {
  const { clients, deleteClient } = useData();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;

    return clients.filter((c) => {
      const name = `${c.nomeFantasia || ""} ${c.razaoSocial || ""}`.toLowerCase();
      const cnpj = (c.cnpj || "").toLowerCase();
      const tags = (c.segmentoTags || []).join(" ").toLowerCase();
      const city = `${c.endereco?.cidade || ""} ${c.endereco?.uf || ""}`.toLowerCase();
      return name.includes(q) || cnpj.includes(q) || tags.includes(q) || city.includes(q);
    });
  }, [clients, search]);

  const handleNew = () => {
    setSelectedClient(null);
    setDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleDeleteClient = (clientId: string) => {
    const ok = window.confirm("Tem certeza que deseja excluir este cliente?");
    if (!ok) return;
    deleteClient(clientId);
    toast.success("Cliente excluído");
  };

  const handleOpenExistingClient = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Clientes</CardTitle>
            <p className="text-sm text-muted-foreground">Gerencie cadastro, segmentos, contato e preferências.</p>
          </div>

          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-md">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, CNPJ, tags ou cidade"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filtered.length} cliente{filtered.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Segmentos</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Relacionamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Último contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Link to={`/clientes/${client.id}`} className="font-medium hover:underline">
                          {client.nomeFantasia || client.razaoSocial}
                        </Link>
                        <span className="text-sm text-muted-foreground">{client.razaoSocial}</span>
                        {client.cnpj && <span className="text-xs text-muted-foreground">CNPJ: {client.cnpj}</span>}
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
                        {client.preferenciasRelacionamento?.frequencia ? (
                          <span className="text-xs text-muted-foreground">
                            Frequência: {followUpLabels[client.preferenciasRelacionamento.frequencia]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Frequência: -</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={client.status === "ativo" ? "default" : "secondary"}>
                        {client.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {client.risk === "low" ? "Baixo" : client.risk === "medium" ? "Médio" : "Alto"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground">{client.lastContact || "-"}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClient(client)}
                          aria-label="Editar cliente"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClient(client.id)}
                          aria-label="Excluir cliente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={selectedClient}
        onOpenExistingClient={handleOpenExistingClient}
      />
    </div>
  );
}
