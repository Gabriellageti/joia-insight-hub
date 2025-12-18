import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  name: string;
}

interface DocumentFiltersProps {
  clients: FilterOption[];
  projects: FilterOption[];
  selectedClientId: string | null;
  selectedProjectId: string | null;
  onClientChange: (clientId: string | null) => void;
  onProjectChange: (projectId: string | null) => void;
  getProjectsForClient: (clientId: string) => FilterOption[];
}

export function DocumentFilters({
  clients,
  projects,
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  getProjectsForClient,
}: DocumentFiltersProps) {
  const [clientOpen, setClientOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const availableProjects = useMemo(() => {
    if (selectedClientId) {
      return getProjectsForClient(selectedClientId);
    }
    return projects;
  }, [selectedClientId, projects, getProjectsForClient]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedProject = availableProjects.find((p) => p.id === selectedProjectId);

  const handleClientChange = (clientId: string | null) => {
    onClientChange(clientId);
    if (clientId !== selectedClientId) {
      onProjectChange(null);
    }
  };

  const contextChip = useMemo(() => {
    if (!selectedClient && !selectedProject) return null;
    const parts = [];
    if (selectedClient) parts.push(selectedClient.name);
    if (selectedProject) parts.push(selectedProject.name);
    return parts.join(" > ");
  }, [selectedClient, selectedProject]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Cliente Filter */}
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={clientOpen}
              className="w-[200px] justify-between"
            >
              {selectedClient ? selectedClient.name : "Todos os clientes"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 z-50 bg-popover">
            <Command>
              <CommandInput placeholder="Buscar cliente..." />
              <CommandList>
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      handleClientChange(null);
                      setClientOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedClientId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todos os clientes
                  </CommandItem>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={() => {
                        handleClientChange(client.id);
                        setClientOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedClientId === client.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {client.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Projeto Filter */}
        <Popover open={projectOpen} onOpenChange={setProjectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={projectOpen}
              className="w-[220px] justify-between"
            >
              {selectedProject ? selectedProject.name : "Todos os projetos"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0 z-50 bg-popover">
            <Command>
              <CommandInput placeholder="Buscar projeto..." />
              <CommandList>
                <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      onProjectChange(null);
                      setProjectOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedProjectId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todos os projetos
                  </CommandItem>
                  {availableProjects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.name}
                      onSelect={() => {
                        onProjectChange(project.id);
                        setProjectOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProjectId === project.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {project.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {(selectedClientId || selectedProjectId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleClientChange(null);
              onProjectChange(null);
            }}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Context Chip */}
      {contextChip && (
        <Badge variant="secondary" className="text-sm">
          Exibindo: {contextChip}
        </Badge>
      )}
    </div>
  );
}
