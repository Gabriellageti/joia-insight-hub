import { supabase } from "./client";
import type { OperationsDashboardData, TeamOperationsMember } from "@/types/operations";

export interface OperationsDashboardFilters {
  workspaceId?: string;
  periodDays?: number;
  clientId?: string;
  responsibleId?: string;
}

export async function getOperationsDashboard(filters: OperationsDashboardFilters): Promise<OperationsDashboardData> {
  const { data, error } = await supabase.rpc("get_operations_dashboard", {
    _workspace_id: filters.workspaceId ?? undefined,
    _period_days: filters.periodDays ?? 30,
    _client_id: filters.clientId ?? undefined,
    _responsible_id: filters.responsibleId ?? undefined,
  });
  if (error) throw error;
  return data as unknown as OperationsDashboardData;
}

export async function getTeamOperations(workspaceId?: string): Promise<TeamOperationsMember[]> {
  const { data, error } = await supabase.rpc("get_team_operations", { _workspace_id: workspaceId ?? undefined });
  if (error) throw error;
  return data as unknown as TeamOperationsMember[];
}
