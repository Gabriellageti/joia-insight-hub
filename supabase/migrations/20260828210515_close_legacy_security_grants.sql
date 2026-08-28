BEGIN;

-- These legacy finance support tables were added after the broad anon-grant
-- revocation migration. Neither participates in sign-in or public flows.
REVOKE ALL ON TABLE
  public.financial_recurring_rules,
  public.legacy_financial_reconciliation_report
FROM anon;

-- This reconciliation snapshot is an internal migration aid, not an app API.
REVOKE ALL ON TABLE public.legacy_financial_reconciliation_report FROM authenticated;

-- Authorization policies now read protected role tables through private
-- helpers. The historical public helper must not remain an RPC endpoint.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

COMMIT;
