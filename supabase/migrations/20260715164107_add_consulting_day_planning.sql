CREATE TABLE public.consulting_day_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  day_number smallint NOT NULL,
  theme text NOT NULL,
  objective text NOT NULL,
  expected_decisions text[] NOT NULL DEFAULT '{}',
  meeting_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consulting_day_plans_day_number_check CHECK (day_number BETWEEN 1 AND 99),
  CONSTRAINT consulting_day_plans_theme_not_blank CHECK (length(trim(theme)) > 0),
  CONSTRAINT consulting_day_plans_objective_not_blank CHECK (length(trim(objective)) > 0),
  CONSTRAINT consulting_day_plans_project_day_unique UNIQUE (project_id, day_number)
);

ALTER TABLE public.consulting_day_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX consulting_day_plans_project_idx
  ON public.consulting_day_plans (project_id, day_number);

CREATE TRIGGER update_consulting_day_plans_updated_at
BEFORE UPDATE ON public.consulting_day_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Project members can view consulting day plans"
ON public.consulting_day_plans FOR SELECT TO authenticated
USING (private.user_project_access_level((SELECT auth.uid()), project_id) >= 1);

CREATE POLICY "Project managers can create consulting day plans"
ON public.consulting_day_plans FOR INSERT TO authenticated
WITH CHECK (private.user_project_access_level((SELECT auth.uid()), project_id) >= 3);

CREATE POLICY "Project managers can update consulting day plans"
ON public.consulting_day_plans FOR UPDATE TO authenticated
USING (private.user_project_access_level((SELECT auth.uid()), project_id) >= 3)
WITH CHECK (private.user_project_access_level((SELECT auth.uid()), project_id) >= 3);

CREATE POLICY "Project managers can delete consulting day plans"
ON public.consulting_day_plans FOR DELETE TO authenticated
USING (private.user_project_access_level((SELECT auth.uid()), project_id) >= 3);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consulting_day_plans TO authenticated;
REVOKE ALL ON public.consulting_day_plans FROM anon;

ALTER TABLE public.tasks
  ADD COLUMN consulting_day smallint,
  ADD CONSTRAINT tasks_consulting_day_check CHECK (consulting_day IS NULL OR consulting_day BETWEEN 1 AND 99),
  ADD CONSTRAINT tasks_consulting_day_project_check CHECK (consulting_day IS NULL OR (task_type = 'project' AND project_id IS NOT NULL));

CREATE INDEX tasks_project_consulting_day_idx
  ON public.tasks (project_id, consulting_day, status)
  WHERE consulting_day IS NOT NULL;

CREATE INDEX tasks_assignee_consulting_day_idx
  ON public.tasks (assigned_to, consulting_day)
  WHERE consulting_day IS NOT NULL;

CREATE OR REPLACE FUNCTION private.validate_task_consulting_day()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  parsed_day smallint;
BEGIN
  IF NEW.consulting_day IS NULL
     AND NEW.project_id IS NOT NULL
     AND NEW.source_action_id IS NOT NULL
     AND NEW.source_action_id ~ '(^|-)dia-[0-9]+(-|$)' THEN
    parsed_day := (regexp_match(NEW.source_action_id, '(^|-)dia-([0-9]+)(-|$)'))[2]::smallint;
    IF EXISTS (
      SELECT 1
      FROM public.consulting_day_plans plan
      WHERE plan.project_id = NEW.project_id AND plan.day_number = parsed_day
    ) THEN
      NEW.consulting_day := parsed_day;
    END IF;
  END IF;

  IF NEW.consulting_day IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.consulting_day_plans plan
    WHERE plan.project_id = NEW.project_id AND plan.day_number = NEW.consulting_day
  ) THEN
    RAISE EXCEPTION 'consulting day % is not configured for project %', NEW.consulting_day, NEW.project_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_task_consulting_day() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_task_consulting_day ON public.tasks;
CREATE TRIGGER validate_task_consulting_day
BEFORE INSERT OR UPDATE OF consulting_day, project_id, source_action_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.validate_task_consulting_day();

WITH target_project AS (
  SELECT project.id
  FROM public.projects project
  JOIN public.clients client ON client.id = project.client_id
  WHERE lower(trim(project.name)) = 'grupo h2o'
    AND lower(client.name) LIKE '%agua 2 o distribuidora%'
  ORDER BY project.created_at
  LIMIT 1
), day_data(day_number, theme, objective, expected_decisions) AS (
  VALUES
    (1::smallint,
     'Direcionamento, prioridades e velocidade nas decisões',
     'Alinhar a equipe sobre a necessidade de tomar decisões com mais rapidez, estabelecer prioridades e criar um controle de prazos para todas as ações do Ciclo 3.',
     ARRAY['Definir quais problemas são considerados críticos.','Criar uma ordem de prioridade para as ações.','Definir responsáveis e prazos para cada tema do Ciclo 3.','Criar uma planilha ou painel de acompanhamento.','Estabelecer metas simples e objetivas.']),
    (2::smallint,
     'Operação, FIFO, bipagem e padronização da equipe',
     'Padronizar os conhecimentos operacionais da equipe e verificar se os processos básicos estão funcionando corretamente.',
     ARRAY['Definir quem conduzirá o treinamento de FIFO.','Definir quais colaboradores participarão.','Estabelecer uma data para o treinamento.','Realizar testes práticos no processo de bipagem.','Confirmar oficialmente se a bipagem está ativa e funcionando corretamente.','Criar um procedimento para comunicar mudanças de sistema à liderança.']),
    (3::smallint,
     'Sistemas Linx, TOTVS e implantação em 1º de agosto',
     'Avaliar os problemas do Linx, validar os recursos do TOTVS e acompanhar a implantação do novo sistema.',
     ARRAY['Definir quais reclamações do Linx precisam ser resolvidas imediatamente.','Confirmar quais módulos do TOTVS serão utilizados.','Definir se o TOTVS atende às necessidades de compras e gestão comercial.','Aprovar ou revisar o cronograma de implantação.','Definir responsáveis por cadastro, testes, treinamento e conferência de dados.']),
    (4::smallint,
     'Auditoria financeira: cartões, Pix e Zé Delivery',
     'Verificar se os valores recebidos pelos diferentes meios de pagamento estão sendo corretamente registrados, conciliados e repassados.',
     ARRAY['Definir o responsável pela conciliação.','Estabelecer uma rotina diária ou semanal de conferência.','Definir como as divergências serão registradas e corrigidas.','Criar um relatório padrão por meio de pagamento.','Estabelecer prazo para regularização das diferenças.']),
    (5::smallint,
     'Faturamento, custos, compras e construção das metas',
     'Analisar os resultados financeiros e construir metas de faturamento coerentes para cada empresa do Grupo H2O.',
     ARRAY['Definir a meta de faturamento de cada empresa.','Definir metas mensais e semanais.','Estabelecer quais indicadores serão apresentados nas reuniões de segunda-feira.','Definir responsáveis pela atualização dos números.','Criar um modelo único de análise de resultados.']),
    (6::smallint,
     'Vendas B2B, equipe comercial e recuperação do balcão',
     'Estruturar novas frentes comerciais, aumentar a proatividade da equipe e recuperar a força das vendas realizadas pelo balcão.',
     ARRAY['Definir a atuação de Alice e Mariana no B2B.','Estabelecer metas semanais de prospecção.','Definir o perfil da pessoa responsável pelas vendas.','Decidir entre contratação, promoção interna ou redistribuição de funções.','Criar ações para recuperar as vendas do balcão.']),
    (7::smallint,
     'Instagram, WhatsApp e novos canais de relacionamento',
     'Centralizar o atendimento, melhorar a comunicação com os clientes e organizar os canais digitais da empresa.',
     ARRAY['Confirmar a responsabilidade da Tati no Instagram.','Definir o número principal do WhatsApp.','Aprovar os setores e direcionamentos do atendimento.','Definir responsáveis e horários.','Selecionar uma ferramenta de centralização.','Escolher quais ideias do Projeto Chopp serão aprofundadas.']),
    (8::smallint,
     'Projeto de vinhos, revisão do ciclo e próximos passos',
     'Apresentar o projeto comercial de vinhos, revisar os avanços do Ciclo 3 e definir o plano para os próximos meses.',
     ARRAY['Aprovar ou ajustar o evento de vinhos.','Definir data, local, orçamento e responsáveis.','Validar a criação da assinatura ou clube de vinhos.','Avaliar o cumprimento das metas do Ciclo 3.','Criar um plano para os próximos 60 dias.','Definir a periodicidade das próximas reuniões estratégicas.'])
)
INSERT INTO public.consulting_day_plans (project_id, day_number, theme, objective, expected_decisions)
SELECT target_project.id, day_data.day_number, day_data.theme, day_data.objective, day_data.expected_decisions
FROM target_project CROSS JOIN day_data
ON CONFLICT (project_id, day_number) DO NOTHING;

WITH target_project AS (
  SELECT project.id
  FROM public.projects project
  JOIN public.clients client ON client.id = project.client_id
  WHERE lower(trim(project.name)) = 'grupo h2o'
    AND lower(client.name) LIKE '%agua 2 o distribuidora%'
  ORDER BY project.created_at
  LIMIT 1
), parsed_tasks AS (
  SELECT task.id, (regexp_match(task.source_action_id, '(^|-)dia-([1-8])(-|$)'))[2]::smallint AS day_number
  FROM public.tasks task
  JOIN target_project ON target_project.id = task.project_id
  WHERE task.consulting_day IS NULL
    AND task.source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1'
    AND task.source_action_id ~ '(^|-)dia-[1-8](-|$)'
)
UPDATE public.tasks task
SET consulting_day = parsed_tasks.day_number
FROM parsed_tasks
WHERE task.id = parsed_tasks.id;
