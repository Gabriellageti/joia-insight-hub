export const commercialStages = [
  "new_lead", "first_contact", "qualification", "meeting", "proposal", "negotiation", "won", "lost",
] as const;

export type CommercialStage = (typeof commercialStages)[number];

export const commercialStageLabels: Record<CommercialStage, string> = {
  new_lead: "Novo Lead",
  first_contact: "Primeiro Contato",
  qualification: "Qualificação",
  meeting: "Reunião",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Ganho",
  lost: "Perdido",
};

export const defaultStageProbability: Record<CommercialStage, number> = {
  new_lead: 10,
  first_contact: 20,
  qualification: 35,
  meeting: 50,
  proposal: 65,
  negotiation: 80,
  won: 100,
  lost: 0,
};

export const proposalStatuses = ["draft", "sent", "negotiation", "accepted", "rejected", "expired"] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];
export const proposalStatusLabels: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  negotiation: "Em negociação",
  accepted: "Aceita",
  rejected: "Recusada",
  expired: "Expirada",
};

export function calculateCommercialMetrics(
  leads: Array<{ stage: CommercialStage; value: number | null; source: string | null }>,
  proposals: Array<{ status: ProposalStatus }>,
) {
  const open = leads.filter((lead) => !["won", "lost"].includes(lead.stage));
  const won = leads.filter((lead) => lead.stage === "won").length;
  const lost = leads.filter((lead) => lead.stage === "lost").length;
  const decided = won + lost;
  const sources = leads.reduce<Record<string, number>>((result, lead) => {
    const source = lead.source?.trim() || "Não informada";
    result[source] = (result[source] || 0) + 1;
    return result;
  }, {});
  return {
    openCount: open.length,
    pipelineValue: open.reduce((total, lead) => total + Number(lead.value || 0), 0),
    openProposals: proposals.filter((proposal) => ["draft", "sent", "negotiation"].includes(proposal.status)).length,
    won,
    lost,
    conversionRate: decided ? Math.round((won / decided) * 100) : 0,
    sources: Object.entries(sources).sort((left, right) => right[1] - left[1]),
  };
}
