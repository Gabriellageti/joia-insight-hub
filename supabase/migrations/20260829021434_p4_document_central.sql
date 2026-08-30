-- P4 — Central de Documentos e Arquivos
-- Evolves the existing documents table and private Storage bucket. Existing
-- rows and object paths remain valid; no second source of truth is introduced.

BEGIN;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS version_group_id uuid,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current_version boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS previous_version_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS source_provider text NOT NULL DEFAULT 'supabase_storage',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      COALESCE(name, '') || ' ' || COALESCE(display_name, '') || ' ' ||
      COALESCE(description, '') || ' ' || COALESCE(category, '')
    )
  ) STORED;

UPDATE public.documents
SET display_name = COALESCE(NULLIF(BTRIM(description), ''), name),
    storage_path = COALESCE(
      NULLIF(storage_path, ''),
      CASE
        WHEN url LIKE '%/documents/%' THEN split_part(url, '/documents/', 2)
        ELSE url
      END
    ),
    version_group_id = COALESCE(version_group_id, id)
WHERE display_name IS NULL OR storage_path IS NULL OR version_group_id IS NULL;

ALTER TABLE public.documents
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN version_group_id SET NOT NULL,
  ADD CONSTRAINT documents_version_number_positive CHECK (version_number > 0),
  ADD CONSTRAINT documents_file_size_nonnegative CHECK (COALESCE(file_size, 0) >= 0),
  ADD CONSTRAINT documents_source_provider_check CHECK (
    source_provider IN ('supabase_storage', 'google_drive', 'external')
  ),
  ADD CONSTRAINT documents_previous_version_id_fkey
    FOREIGN KEY (previous_version_id) REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD CONSTRAINT documents_archived_by_fkey
    FOREIGN KEY (archived_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX documents_workspace_version_unique
  ON public.documents (workspace_id, version_group_id, version_number);
CREATE INDEX documents_workspace_active_created_idx
  ON public.documents (workspace_id, created_at DESC)
  WHERE archived_at IS NULL AND is_current_version;
CREATE INDEX documents_workspace_client_active_idx
  ON public.documents (workspace_id, client_id, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX documents_workspace_project_active_idx
  ON public.documents (workspace_id, project_id, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX documents_workspace_meeting_active_idx
  ON public.documents (workspace_id, meeting_id, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX documents_workspace_task_active_idx
  ON public.documents (workspace_id, task_id, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX documents_workspace_uploader_active_idx
  ON public.documents (workspace_id, uploaded_by, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX documents_workspace_category_active_idx
  ON public.documents (workspace_id, category, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX documents_workspace_type_active_idx
  ON public.documents (workspace_id, file_type, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX documents_version_history_idx
  ON public.documents (workspace_id, version_group_id, version_number DESC);
CREATE UNIQUE INDEX documents_one_current_version_idx
  ON public.documents (workspace_id, version_group_id)
  WHERE is_current_version;
CREATE INDEX documents_search_vector_idx
  ON public.documents USING gin (search_vector);

CREATE TABLE public.document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'created', 'updated', 'archived', 'restored', 'deleted', 'version_created'
  )),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_events_workspace_created_idx
  ON public.document_events (workspace_id, created_at DESC);
CREATE INDEX document_events_document_created_idx
  ON public.document_events (document_id, created_at DESC);

ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_events_member_select
  ON public.document_events FOR SELECT TO authenticated
  USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 2);

GRANT SELECT ON public.document_events TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.document_events FROM authenticated, anon;
REVOKE ALL ON public.document_events FROM anon;

CREATE OR REPLACE FUNCTION private.audit_document_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_action text;
  event_workspace uuid;
  event_document uuid;
  event_changes jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_action := CASE WHEN NEW.version_number > 1 THEN 'version_created' ELSE 'created' END;
    event_workspace := NEW.workspace_id;
    event_document := NEW.id;
    event_changes := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    event_action := 'deleted';
    event_workspace := OLD.workspace_id;
    event_document := OLD.id;
    event_changes := jsonb_build_object('old', to_jsonb(OLD));
  ELSE
    event_action := CASE
      WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN 'archived'
      WHEN OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN 'restored'
      ELSE 'updated'
    END;
    event_workspace := NEW.workspace_id;
    event_document := NEW.id;
    event_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.document_events (
    workspace_id, document_id, action, actor_id, changes
  ) VALUES (
    event_workspace, event_document, event_action, (SELECT auth.uid()), event_changes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.audit_document_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.prepare_document_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  previous_document public.documents%ROWTYPE;
BEGIN
  IF NEW.previous_version_id IS NULL THEN
    NEW.version_group_id := COALESCE(NEW.version_group_id, NEW.id);
    NEW.version_number := 1;
    NEW.is_current_version := true;
    RETURN NEW;
  END IF;

  SELECT * INTO previous_document
  FROM public.documents
  WHERE id = NEW.previous_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão anterior não encontrada ou sem permissão';
  END IF;
  IF previous_document.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Versões devem pertencer ao mesmo workspace';
  END IF;

  NEW.version_group_id := previous_document.version_group_id;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO NEW.version_number
  FROM public.documents
  WHERE workspace_id = NEW.workspace_id AND version_group_id = NEW.version_group_id;
  NEW.is_current_version := true;

  UPDATE public.documents
  SET is_current_version = false
  WHERE workspace_id = NEW.workspace_id
    AND version_group_id = NEW.version_group_id
    AND is_current_version;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_document_version() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prepare_document_version ON public.documents;
CREATE TRIGGER prepare_document_version
BEFORE INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION private.prepare_document_version();

DROP TRIGGER IF EXISTS audit_document_changes ON public.documents;
CREATE TRIGGER audit_document_changes
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION private.audit_document_change();

-- Document access follows project membership when a project is linked. Files
-- linked only to a client/shared workspace remain visible to operational members.
DROP POLICY IF EXISTS documents_member_select ON public.documents;
DROP POLICY IF EXISTS documents_member_insert ON public.documents;
DROP POLICY IF EXISTS documents_member_update ON public.documents;
DROP POLICY IF EXISTS documents_manager_delete ON public.documents;

CREATE POLICY documents_member_select
  ON public.documents FOR SELECT TO authenticated
  USING (
    COALESCE(private.workspace_access_level(workspace_id), 0) >= 3
    OR (
      COALESCE(private.workspace_access_level(workspace_id), 0) >= 2
      AND (
        project_id IS NULL
        OR private.user_project_access_level((SELECT auth.uid()), project_id) >= 1
      )
    )
  );

CREATE POLICY documents_member_insert
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(private.workspace_access_level(workspace_id), 0) >= 2
    AND uploaded_by = (SELECT auth.uid())
    AND (
      project_id IS NULL
      OR private.user_project_access_level((SELECT auth.uid()), project_id) >= 2
    )
  );

CREATE POLICY documents_member_update
  ON public.documents FOR UPDATE TO authenticated
  USING (
    COALESCE(private.workspace_access_level(workspace_id), 0) >= 2
    AND (
      project_id IS NULL
      OR private.user_project_access_level((SELECT auth.uid()), project_id) >= 2
    )
  )
  WITH CHECK (
    COALESCE(private.workspace_access_level(workspace_id), 0) >= 2
    AND (
      project_id IS NULL
      OR private.user_project_access_level((SELECT auth.uid()), project_id) >= 2
    )
  );

CREATE POLICY documents_manager_delete
  ON public.documents FOR DELETE TO authenticated
  USING (COALESCE(private.workspace_access_level(workspace_id), 0) >= 3);

-- Private files can only be read when their metadata row is visible through
-- documents RLS. Uploads are permitted in the caller's workspace and become
-- readable only after the metadata insert succeeds.
DROP POLICY IF EXISTS documents_storage_member_select ON storage.objects;
DROP POLICY IF EXISTS documents_storage_member_insert ON storage.objects;
DROP POLICY IF EXISTS documents_storage_member_update ON storage.objects;
DROP POLICY IF EXISTS documents_storage_manager_delete ON storage.objects;

CREATE POLICY documents_storage_member_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents AS document
      WHERE document.storage_path = name
    )
  );

CREATE POLICY documents_storage_member_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND COALESCE(private.workspace_access_level(private.storage_workspace_id(name)), 0) >= 2
  );

CREATE POLICY documents_storage_member_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents AS document
      WHERE document.storage_path = name
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents AS document
      WHERE document.storage_path = name
    )
  );

CREATE POLICY documents_storage_manager_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND COALESCE(private.workspace_access_level(private.storage_workspace_id(name)), 0) >= 3
    AND EXISTS (
      SELECT 1 FROM public.documents AS document
      WHERE document.storage_path = name
    )
  );

UPDATE storage.buckets
SET public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/zip'
    ]
WHERE id = 'documents';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
REVOKE ALL ON public.documents FROM anon;

COMMIT;
