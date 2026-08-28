import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Client } from "@/types";
import ClienteJornada from "./ClienteJornada";

const state = vi.hoisted(() => ({
  data: {
    clients: [] as Client[],
    clientsLoading: true,
    projects: [],
    diagnostics: [],
    templates: [],
  },
}));

vi.mock("@/contexts/DataContext", () => ({ useData: () => state.data }));
vi.mock("@/hooks/useClientJourney", () => ({
  useClientJourney: () => ({
    events: [], loading: false, error: null, currentPhase: "kickoff", phases: [],
    suggestedActions: [], overallProgress: 0, registerEvent: vi.fn(), refresh: vi.fn(),
  }),
}));
vi.mock("@/components/jornada", () => ({
  JourneyTimeline: () => null,
  PhaseChecklist: () => null,
  NextActionsCard: () => null,
}));
vi.mock("@/components/dialogs/ProjectDialog", () => ({ ProjectDialog: () => null }));
vi.mock("@/components/dialogs/DiagnosticDialog", () => ({ DiagnosticDialog: () => null }));
vi.mock("@/components/dialogs/MeetingDialog", () => ({ MeetingDialog: () => null }));
vi.mock("@/components/dialogs/ClientDialog", () => ({ ClientDialog: () => null }));

const client: Client = {
  id: "client-1", razaoSocial: "Cliente Teste Ltda", nomeFantasia: "Cliente Teste",
  segmentoTags: [], status: "ativo", contatoPrincipal: { nome: "Contato" }, endereco: {},
  preferenciasRelacionamento: {}, projects: 0, nps: 0, risk: "low", lastContact: "",
  createdAt: "",
};

function route() {
  return <MemoryRouter initialEntries={["/clientes/client-1/jornada"]}><Routes><Route path="/clientes/:id/jornada" element={<ClienteJornada />} /></Routes></MemoryRouter>;
}

describe("Jornada do Cliente", () => {
  it("mantém a ordem dos hooks entre carregamento e cliente resolvido", () => {
    state.data.clients = [];
    state.data.clientsLoading = true;
    const view = render(route());
    expect(screen.getByText("Carregando jornada do cliente")).toBeInTheDocument();

    state.data.clients = [client];
    state.data.clientsLoading = false;
    expect(() => view.rerender(route())).not.toThrow();
    expect(screen.getByRole("heading", { name: "Jornada: Cliente Teste" })).toBeInTheDocument();
  });
});
