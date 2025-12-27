import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface TaskFiltersProps {
  clients: { id: string; name: string }[];
  responsibles: string[];
  selectedClient: string;
  selectedResponsible: string;
  onClientChange: (value: string) => void;
  onResponsibleChange: (value: string) => void;
  onClear: () => void;
}

export function TaskFilters({
  clients,
  responsibles,
  selectedClient,
  selectedResponsible,
  onClientChange,
  onResponsibleChange,
  onClear,
}: TaskFiltersProps) {
  const hasFilters = selectedClient !== "all" || selectedResponsible !== "all";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filtros:
      </div>

      <Select value={selectedClient} onValueChange={onClientChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedResponsible} onValueChange={onResponsibleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os responsáveis</SelectItem>
          {responsibles.map((responsible) => (
            <SelectItem key={responsible} value={responsible}>
              {responsible}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
