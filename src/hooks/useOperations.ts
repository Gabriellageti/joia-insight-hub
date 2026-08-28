import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getOperationsDashboard, getTeamOperations, type OperationsDashboardFilters } from "@/integrations/supabase/operations";
import { hasWorkspaceRole } from "@/lib/authorization";

export function useOperationsDashboard(filters: Omit<OperationsDashboardFilters, "workspaceId"> = {}) {
  const { activeMembership } = useAuth();
  return useQuery({
    queryKey: ["operations-dashboard", activeMembership?.workspaceId, filters],
    queryFn: () => getOperationsDashboard({ ...filters, workspaceId: activeMembership?.workspaceId }),
    enabled: Boolean(activeMembership?.workspaceId),
    staleTime: 30_000,
  });
}

export function useTeamOperations() {
  const { activeMembership } = useAuth();
  const manager = hasWorkspaceRole(activeMembership?.role, "manager");
  return useQuery({
    queryKey: ["team-operations", activeMembership?.workspaceId],
    queryFn: () => getTeamOperations(activeMembership?.workspaceId),
    enabled: Boolean(activeMembership?.workspaceId && manager),
    staleTime: 30_000,
  });
}
