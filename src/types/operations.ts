export type OperationalHealth = "healthy" | "attention" | "risk" | "critical" | "completed";

export interface OperationsKpis {
  activeProjects: number;
  riskProjects: number;
  lateProjects: number;
  openTasks: number;
  lateTasks: number;
  blockedTasks: number;
  attentionClients: number;
  pendingMeetings: number;
  weekDeliveries: number;
}

export interface OperationalProjectHealth {
  workspace_id: string;
  project_id: string;
  client_id: string | null;
  project_name: string;
  client_name: string | null;
  project_status: string | null;
  end_date: string | null;
  responsible: string | null;
  total_tasks: number;
  done_tasks: number;
  progress: number;
  open_tasks: number;
  overdue_tasks: number;
  blocked_tasks: number;
  urgent_tasks: number;
  pending_meetings: number;
  overdue_next_steps: number;
  last_activity_at: string;
  risk_score: number;
  health: OperationalHealth;
  risk_reasons: string[];
}

export interface OperationalClientHealth {
  workspace_id: string;
  client_id: string;
  client_name: string;
  client_status: string | null;
  active_projects: number;
  risk_projects: number;
  critical_projects: number;
  open_tasks: number;
  overdue_tasks: number;
  blocked_tasks: number;
  last_activity_at: string;
  no_follow_up: boolean;
  risk_score: number;
  health: Exclude<OperationalHealth, "completed">;
  risk_reasons: string[];
}

export interface AttentionItem {
  id: string;
  type: "task" | "project" | "client" | "meeting";
  title: string;
  due_date: string | null;
  client_id: string | null;
  project_id: string | null;
  reason: string;
  priority_rank: number;
}

export interface DeliveryItem {
  type: "task" | "deliverable" | "milestone" | "next_step" | "meeting";
  id: string;
  title: string;
  due_date: string;
  client_id: string | null;
  project_id: string | null;
  responsible_id: string | null;
  status: string;
}

export interface OperationsDashboardData {
  scope: "personal" | "company";
  periodDays: number;
  kpis: OperationsKpis;
  projects: OperationalProjectHealth[];
  clients: OperationalClientHealth[];
  attention: AttentionItem[];
  deliveries: DeliveryItem[];
  weekly: { completedTasks: number; createdTasks: number; newBlocks: number; completedMeetings: number };
}

export interface TeamOperationsMember {
  user_id: string;
  member_name: string;
  role: string;
  open_tasks: number;
  today_tasks: number;
  overdue_tasks: number;
  blocked_tasks: number;
  week_completed: number;
  active_projects: number;
  week_deliveries: number;
  capacity: "available" | "normal" | "high" | "overloaded";
}
