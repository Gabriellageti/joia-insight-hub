import type { Contract } from "@/types";

export const buildContractUpdatePayload = (contract: Partial<Contract>) => {
  const payload: Record<string, unknown> = {};

  if (contract.title !== undefined) payload.title = contract.title;
  if (contract.clientId !== undefined) payload.client_id = contract.clientId || null;
  if (contract.projectId !== undefined) payload.project_id = contract.projectId || null;
  if (contract.value !== undefined) payload.value = contract.value;
  if (contract.startDate !== undefined) payload.start_date = contract.startDate || null;
  if (contract.endDate !== undefined) payload.end_date = contract.endDate || null;
  if (contract.billingType !== undefined) payload.billing_type = contract.billingType;
  if (contract.installments !== undefined) payload.installments = contract.installments;

  return payload;
};
