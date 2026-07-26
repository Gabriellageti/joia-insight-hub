import { describe, expect, test } from "bun:test";
import type { Client } from "@/types";
import { filterClients } from "./filters";

const clients = [
  {
    id: "active",
    razaoSocial: "Indústria São José",
    nomeFantasia: "São José",
    cnpj: "12.345.678/0001-90",
    segmentoTags: ["Manufatura"],
    status: "ativo",
    risk: "low",
    endereco: { cidade: "Goiânia", uf: "GO" },
    contatoPrincipal: { nome: "Ana", email: "ana@example.com" },
  },
  {
    id: "inactive",
    razaoSocial: "Comércio Central",
    segmentoTags: ["Varejo"],
    status: "inativo",
    risk: "high",
    endereco: { cidade: "Brasília", uf: "DF" },
    contatoPrincipal: { nome: "Bruno" },
  },
] as Client[];

describe("client filters", () => {
  test("busca sem diferenciar acentos ou maiúsculas", () => {
    expect(filterClients(clients, { search: "industria sao", status: "todos", risk: "todos" }))
      .toHaveLength(1);
    expect(filterClients(clients, { search: "goiania", status: "todos", risk: "todos" })[0]?.id)
      .toBe("active");
  });

  test("combina status, risco e busca", () => {
    expect(filterClients(clients, { search: "varejo", status: "inativo", risk: "high" })[0]?.id)
      .toBe("inactive");
    expect(filterClients(clients, { search: "varejo", status: "ativo", risk: "high" }))
      .toHaveLength(0);
  });
});
