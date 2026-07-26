import type { Client } from "@/types";

export type ClientStatusFilter = "todos" | Client["status"];
export type ClientRiskFilter = "todos" | Client["risk"];

export interface ClientFilters {
  search: string;
  status: ClientStatusFilter;
  risk: ClientRiskFilter;
}

const normalizeSearchValue = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

export function filterClients(clients: Client[], filters: ClientFilters): Client[] {
  const term = normalizeSearchValue(filters.search);

  return clients.filter((client) => {
    if (filters.status !== "todos" && client.status !== filters.status) return false;
    if (filters.risk !== "todos" && client.risk !== filters.risk) return false;
    if (!term) return true;

    const searchableValues = [
      client.razaoSocial,
      client.nomeFantasia,
      client.name,
      client.tradeName,
      client.cnpj,
      ...(client.segmentoTags ?? []),
      client.endereco?.cidade,
      client.endereco?.uf,
      client.contatoPrincipal?.nome,
      client.contatoPrincipal?.email,
    ];

    return searchableValues.some((value) => value && normalizeSearchValue(value).includes(term));
  });
}
