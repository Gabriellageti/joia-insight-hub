-- P11: fix compiled RLS expressions that lost the outer-row correlation due to
-- unqualified column names. This migration is intentionally non-destructive.
BEGIN;

DROP POLICY IF EXISTS documents_storage_member_select ON storage.objects;
DROP POLICY IF EXISTS documents_storage_member_update ON storage.objects;
DROP POLICY IF EXISTS documents_storage_manager_delete ON storage.objects;

CREATE POLICY documents_storage_member_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    storage.objects.bucket_id = 'documents'
    AND COALESCE(
      private.workspace_access_level(private.storage_workspace_id(storage.objects.name)),
      0
    ) >= 2
    AND EXISTS (
      SELECT 1
      FROM public.documents AS d
      WHERE d.storage_path = storage.objects.name
        AND d.workspace_id = private.storage_workspace_id(storage.objects.name)
    )
  );

CREATE POLICY documents_storage_member_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    storage.objects.bucket_id = 'documents'
    AND COALESCE(
      private.workspace_access_level(private.storage_workspace_id(storage.objects.name)),
      0
    ) >= 2
    AND EXISTS (
      SELECT 1
      FROM public.documents AS d
      WHERE d.storage_path = storage.objects.name
        AND d.workspace_id = private.storage_workspace_id(storage.objects.name)
    )
  )
  WITH CHECK (
    storage.objects.bucket_id = 'documents'
    AND COALESCE(
      private.workspace_access_level(private.storage_workspace_id(storage.objects.name)),
      0
    ) >= 2
    AND EXISTS (
      SELECT 1
      FROM public.documents AS d
      WHERE d.storage_path = storage.objects.name
        AND d.workspace_id = private.storage_workspace_id(storage.objects.name)
    )
  );

CREATE POLICY documents_storage_manager_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    storage.objects.bucket_id = 'documents'
    AND COALESCE(
      private.workspace_access_level(private.storage_workspace_id(storage.objects.name)),
      0
    ) >= 3
    AND EXISTS (
      SELECT 1
      FROM public.documents AS d
      WHERE d.storage_path = storage.objects.name
        AND d.workspace_id = private.storage_workspace_id(storage.objects.name)
    )
  );

DROP POLICY IF EXISTS commercial_activities_manager_insert ON public.commercial_activities;
CREATE POLICY commercial_activities_manager_insert
  ON public.commercial_activities FOR INSERT TO authenticated
  WITH CHECK (
    commercial_activities.created_by = (SELECT auth.uid())
    AND COALESCE(private.workspace_access_level(commercial_activities.workspace_id), 0) >= 3
    AND EXISTS (
      SELECT 1 FROM public.leads AS l
      WHERE l.id = commercial_activities.lead_id
        AND l.workspace_id = commercial_activities.workspace_id
    )
  );

DROP POLICY IF EXISTS commercial_proposals_manager_insert ON public.commercial_proposals;
DROP POLICY IF EXISTS commercial_proposals_manager_update ON public.commercial_proposals;
CREATE POLICY commercial_proposals_manager_insert
  ON public.commercial_proposals FOR INSERT TO authenticated
  WITH CHECK (
    commercial_proposals.created_by = (SELECT auth.uid())
    AND COALESCE(private.workspace_access_level(commercial_proposals.workspace_id), 0) >= 3
    AND EXISTS (
      SELECT 1 FROM public.leads AS l
      WHERE l.id = commercial_proposals.lead_id
        AND l.workspace_id = commercial_proposals.workspace_id
    )
  );
CREATE POLICY commercial_proposals_manager_update
  ON public.commercial_proposals FOR UPDATE TO authenticated
  USING (COALESCE(private.workspace_access_level(commercial_proposals.workspace_id), 0) >= 3)
  WITH CHECK (
    COALESCE(private.workspace_access_level(commercial_proposals.workspace_id), 0) >= 3
    AND EXISTS (
      SELECT 1 FROM public.leads AS l
      WHERE l.id = commercial_proposals.lead_id
        AND l.workspace_id = commercial_proposals.workspace_id
    )
  );

DROP POLICY IF EXISTS commercial_follow_ups_manager_insert ON public.commercial_follow_ups;
DROP POLICY IF EXISTS commercial_follow_ups_scoped_update ON public.commercial_follow_ups;
CREATE POLICY commercial_follow_ups_manager_insert
  ON public.commercial_follow_ups FOR INSERT TO authenticated
  WITH CHECK (
    commercial_follow_ups.created_by = (SELECT auth.uid())
    AND COALESCE(private.workspace_access_level(commercial_follow_ups.workspace_id), 0) >= 3
    AND private.user_workspace_access_level(
      commercial_follow_ups.responsible_user_id,
      commercial_follow_ups.workspace_id
    ) >= 1
    AND EXISTS (
      SELECT 1 FROM public.leads AS l
      WHERE l.id = commercial_follow_ups.lead_id
        AND l.workspace_id = commercial_follow_ups.workspace_id
    )
  );
CREATE POLICY commercial_follow_ups_scoped_update
  ON public.commercial_follow_ups FOR UPDATE TO authenticated
  USING (
    commercial_follow_ups.responsible_user_id = (SELECT auth.uid())
    OR COALESCE(private.workspace_access_level(commercial_follow_ups.workspace_id), 0) >= 3
  )
  WITH CHECK (
    (
      commercial_follow_ups.responsible_user_id = (SELECT auth.uid())
      OR COALESCE(private.workspace_access_level(commercial_follow_ups.workspace_id), 0) >= 3
    )
    AND private.user_workspace_access_level(
      commercial_follow_ups.responsible_user_id,
      commercial_follow_ups.workspace_id
    ) >= 1
    AND EXISTS (
      SELECT 1 FROM public.leads AS l
      WHERE l.id = commercial_follow_ups.lead_id
        AND l.workspace_id = commercial_follow_ups.workspace_id
    )
  );

-- The P10 migration revoked anon explicitly but left the implicit PUBLIC grant.
-- The authenticated wrapper is the only browser entry point.
REVOKE ALL ON FUNCTION public.run_scheduled_automations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_scheduled_automations() TO authenticated;

COMMIT;
