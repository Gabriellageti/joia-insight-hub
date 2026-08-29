import type { Database } from "@/integrations/supabase/types";

export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type AuthorizationPermission =
  | "workspace.read"
  | "workspace.manage"
  | "templates.read"
  | "templates.create"
  | "templates.update"
  | "templates.archive"
  | "templates.delete"
  | "finance.read"
  | "finance.write";

const workspaceRoleLevel: Record<WorkspaceRole, number> = {
  viewer: 1,
  member: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

export function hasWorkspaceRole(
  role: WorkspaceRole | null | undefined,
  minimum: WorkspaceRole,
) {
  return role !== null && role !== undefined && workspaceRoleLevel[role] >= workspaceRoleLevel[minimum];
}

export function isAllowed(
  permission: AuthorizationPermission,
  role: WorkspaceRole | null | undefined,
  appRoles: readonly AppRole[] = [],
) {
  switch (permission) {
    case "workspace.read":
    case "templates.read":
      return hasWorkspaceRole(role, "viewer");
    case "templates.create":
    case "templates.update":
    case "templates.archive":
      return hasWorkspaceRole(role, "manager");
    case "workspace.manage":
    case "templates.delete":
      return hasWorkspaceRole(role, "admin");
    case "finance.read":
    case "finance.write":
      return hasWorkspaceRole(role, "member")
        && (hasWorkspaceRole(role, "manager") || appRoles.includes("financeiro_joia"));
  }
}
