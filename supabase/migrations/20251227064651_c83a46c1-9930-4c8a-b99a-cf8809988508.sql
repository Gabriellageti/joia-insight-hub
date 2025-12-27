-- Add new columns to documents table for enhanced document management
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'contracts',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS file_type text DEFAULT 'Documento',
ADD COLUMN IF NOT EXISTS evidence_status text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'Interno',
ADD COLUMN IF NOT EXISTS file_size bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS diagnostic_id uuid REFERENCES public.diagnostics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Create index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_evidence_status ON public.documents(evidence_status);