BEGIN;

-- Login and signup do not need direct access to corporate tables. Historical
-- grants made these objects discoverable through GraphQL even though RLS denied
-- their rows, so remove the grants at the role boundary as defense in depth.
REVOKE ALL ON TABLE
  public.client_contacts,
  public.client_journey_events,
  public.clients,
  public.content_items,
  public.contracts,
  public.deliverables,
  public.diagnostic_templates,
  public.diagnostics,
  public.documents,
  public.employees,
  public.financial_records,
  public.indicator_history,
  public.indicators,
  public.leads,
  public.meetings,
  public.notification_preferences,
  public.opportunities,
  public.playbooks,
  public.profiles,
  public.project_audit_logs,
  public.project_members,
  public.projects,
  public.push_subscriptions,
  public.task_comments,
  public.task_history,
  public.tasks,
  public.template_opportunity_rules,
  public.template_questions,
  public.template_sections,
  public.user_preferences,
  public.user_roles,
  public.workspace_members,
  public.workspaces
FROM anon;

-- Both functions are trigger entry points. They must not be callable as RPCs.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_contract_installment_status() FROM PUBLIC, anon, authenticated;

COMMIT;
