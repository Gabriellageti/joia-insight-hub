import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Client {
  id: string;
  name: string;
  segment: string;
  city: string;
  status: "ativo" | "inativo";
  projects: number;
  nps: number;
  risk: "low" | "medium" | "high";
  lastContact: string;
}

const mockClients: Client[] = [
  { id: "1", name: "Empresa ABC Ltda", segment: "Indústria", city: "São Paulo", status: "ativo", projects: 2, nps: 9, risk: "low", lastContact: "15/12/2024" },
  { id: "2", name: "Indústria XYZ S.A.", segment: "Manufatura", city: "Campinas", status: "ativo", projects: 1, nps: 7, risk: "medium", lastContact: "10/12/2024" },
  { id: "3", name: "Comércio 123", segment: "Varejo", city: "Rio de Janeiro", status: "ativo", projects: 3, nps: 8, risk: "low", lastContact: "18/12/2024" },
  { id: "4", name: "Serviços JKL", segment: "Serviços", city: "Belo Horizonte", status: "inativo", projects: 0, nps: 6, risk: "high", lastContact: "01/11/2024" },
];

const riskColors = {
  low: "bg-green-500/10 text-green-700",
  medium: "bg-yellow-500/10 text-yellow-700",
  high: "bg-red-500/10 text-red-700",
};

const riskLabels = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
};

export default function Clientes() {
  const [search, setSearch] = useState("");

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua carteira de clientes</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar cliente..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>NPS</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Último Contato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.segment}</TableCell>
                  <TableCell>{client.city}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === "ativo" ? "default" : "secondary"}>
                      {client.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.projects}</TableCell>
                  <TableCell>
                    <span className={client.nps >= 8 ? "text-green-600 font-medium" : client.nps >= 6 ? "text-yellow-600" : "text-red-600"}>
                      {client.nps}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={riskColors[client.risk]} variant="outline">
                      {riskLabels[client.risk]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.lastContact}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
