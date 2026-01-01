-- =====================================================
-- FASE 1: Criar tabelas faltantes para persistência
-- =====================================================

-- 1. Tabela de Oportunidades (identificadas em diagnósticos)
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  diagnostic_id UUID REFERENCES public.diagnostics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  estimated_value NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'media',
  status TEXT DEFAULT 'identificada',
  source TEXT,
  evidence_type TEXT DEFAULT 'a_coletar',
  effort TEXT DEFAULT 'medio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Entregáveis de Projetos
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pendente',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  responsible TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Itens de Conteúdo (Calendário Editorial)
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'idea',
  scheduled_date DATE,
  content TEXT,
  author TEXT,
  platform TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Contratos
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'ativo',
  billing_type TEXT,
  installments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela de Contatos de Clientes
CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabela de Logs de Auditoria de Projetos
CREATE TABLE public.project_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES PARA OPPORTUNITIES
-- =====================================================

CREATE POLICY "Authenticated users can view opportunities"
  ON public.opportunities FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update opportunities"
  ON public.opportunities FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete opportunities"
  ON public.opportunities FOR DELETE
  USING (true);

-- =====================================================
-- POLICIES PARA DELIVERABLES
-- =====================================================

CREATE POLICY "Authenticated users can view deliverables"
  ON public.deliverables FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert deliverables"
  ON public.deliverables FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deliverables"
  ON public.deliverables FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete deliverables"
  ON public.deliverables FOR DELETE
  USING (true);

-- =====================================================
-- POLICIES PARA CONTENT_ITEMS
-- =====================================================

CREATE POLICY "Authenticated users can view content_items"
  ON public.content_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert content_items"
  ON public.content_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update content_items"
  ON public.content_items FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete content_items"
  ON public.content_items FOR DELETE
  USING (true);

-- =====================================================
-- POLICIES PARA CONTRACTS
-- =====================================================

CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON public.contracts FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete contracts"
  ON public.contracts FOR DELETE
  USING (true);

-- =====================================================
-- POLICIES PARA CLIENT_CONTACTS
-- =====================================================

CREATE POLICY "Authenticated users can view client_contacts"
  ON public.client_contacts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert client_contacts"
  ON public.client_contacts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update client_contacts"
  ON public.client_contacts FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete client_contacts"
  ON public.client_contacts FOR DELETE
  USING (true);

-- =====================================================
-- POLICIES PARA PROJECT_AUDIT_LOGS
-- =====================================================

CREATE POLICY "Authenticated users can view audit_logs"
  ON public.project_audit_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert audit_logs"
  ON public.project_audit_logs FOR INSERT
  WITH CHECK (true);

-- Audit logs não devem ser alterados ou deletados
-- (apenas INSERT e SELECT)

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();