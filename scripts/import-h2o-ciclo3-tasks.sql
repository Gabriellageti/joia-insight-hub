-- Administrative, transactional and idempotent import for:
-- Planejamento Ciclo 3 — Grupo H2O
--
-- Run only through the linked Supabase administrative CLI connection:
--   npx supabase db query --linked --file scripts/import-h2o-ciclo3-tasks.sql

BEGIN;

CREATE TEMP TABLE h2o_import_context AS
SELECT
  project.id AS project_id,
  project.client_id,
  project.name AS project_name,
  client.name AS client_name,
  administrator.id AS administrator_id,
  administrator.full_name AS administrator_name
FROM public.projects AS project
JOIN public.clients AS client ON client.id = project.client_id
JOIN public.profiles AS administrator ON administrator.id = '2320b1be-f999-4a1a-b1d4-79458041d13d'::uuid
WHERE project.id = 'b12b4401-bc33-4d21-87dd-fde56282d279'::uuid
  AND project.name = 'Grupo H2O'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles AS role_entry
    WHERE role_entry.user_id = administrator.id
      AND role_entry.role = 'admin_joia'::public.app_role
  );

DO $$
BEGIN
  IF (SELECT count(*) FROM h2o_import_context) <> 1 THEN
    RAISE EXCEPTION 'Importação interrompida: projeto Grupo H2O ou administrador esperado não foi encontrado.';
  END IF;

  IF (SELECT client_id FROM h2o_import_context) IS NULL THEN
    RAISE EXCEPTION 'Importação interrompida: o projeto Grupo H2O não possui cliente vinculado.';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT administrator_id::text FROM h2o_import_context),
  true
);
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (SELECT administrator_id::text FROM h2o_import_context),
    'role', 'authenticated'
  )::text,
  true
);

CREATE TEMP TABLE h2o_plan (
  day_number integer PRIMARY KEY,
  theme text NOT NULL,
  objective text NOT NULL,
  points text[] NOT NULL,
  decisions text[] NOT NULL,
  deliveries text[] NOT NULL
);

INSERT INTO h2o_plan (day_number, theme, objective, points, decisions, deliveries)
VALUES
(
  1,
  'DIRECIONAMENTO, PRIORIDADES E VELOCIDADE NAS DECISÕES',
  'Alinhar a equipe sobre a necessidade de tomar decisões com mais rapidez, estabelecer prioridades e criar um controle de prazos para todas as ações do Ciclo 3.',
  ARRAY[
    'A equipe está apresentando morosidade na resolução de alguns problemas.',
    'Problemas que impactam preço, margem, vendas ou operação devem ser tratados como prioridade.',
    'O problema de tributação e precificação dos cigarros deve ser utilizado como exemplo de situação que não pode permanecer sem solução.',
    'É necessário ter mais segurança sobre o caminho que está sendo seguido.',
    'A operação possui tração e está funcionando, mas precisa de mais direcionamento e acompanhamento.',
    'Todas as atividades devem possuir datas claras de início e conclusão.',
    'O funcionamento do novo sistema em 1º de agosto deve ser tratado como um marco importante do planejamento.'
  ],
  ARRAY[
    'Definir quais problemas são considerados críticos.',
    'Criar uma ordem de prioridade para as ações.',
    'Definir responsáveis e prazos para cada tema do Ciclo 3.',
    'Criar uma planilha ou painel de acompanhamento.',
    'Estabelecer metas simples e objetivas.'
  ],
  ARRAY[
    'Consolidar o plano de ação geral do Ciclo 3.',
    'Definir a lista de responsáveis do Ciclo 3.',
    'Montar o cronograma do Ciclo 3 com datas.',
    'Consolidar a relação dos problemas prioritários.',
    'Criar o modelo de acompanhamento semanal.'
  ]
),
(
  2,
  'OPERAÇÃO, FIFO, BIPAGEM E PADRONIZAÇÃO DA EQUIPE',
  'Padronizar os conhecimentos operacionais da equipe e verificar se os processos básicos estão funcionando corretamente.',
  ARRAY[
    'Necessidade de capacitar toda a equipe sobre o FIFO.',
    'No FIFO, os produtos que entram primeiro devem sair primeiro.',
    'Todos os colaboradores precisam conhecer os principais termos técnicos utilizados no mercado.',
    'Verificar se o processo de bipagem já está efetivamente em funcionamento.',
    'Foi informado ao Matheus que a bipagem estava funcionando, mas havia um erro no sistema.',
    'O Chicão ainda não possui uma confirmação clara sobre a situação atual da bipagem.',
    'O sistema anteriormente apresentava um produto diferente daquele que estava sendo bipado.',
    'É necessário melhorar a comunicação interna sobre implantação e funcionamento dos processos.'
  ],
  ARRAY[
    'Definir quem conduzirá o treinamento de FIFO.',
    'Definir quais colaboradores participarão.',
    'Estabelecer uma data para o treinamento.',
    'Realizar testes práticos no processo de bipagem.',
    'Confirmar oficialmente se a bipagem está ativa e funcionando corretamente.',
    'Criar um procedimento para comunicar mudanças de sistema à liderança.'
  ],
  ARRAY[
    'Elaborar o cronograma de treinamento sobre FIFO.',
    'Criar material básico com os termos técnicos do mercado.',
    'Realizar os testes da bipagem e elaborar o relatório.',
    'Consolidar a lista de erros encontrados na bipagem.',
    'Criar o plano de correção dos problemas identificados.'
  ]
),
(
  3,
  'SISTEMAS LINX, TOTVS E IMPLANTAÇÃO EM 1º DE AGOSTO',
  'Avaliar os problemas do Linx, validar os recursos do TOTVS e acompanhar a implantação do novo sistema.',
  ARRAY[
    'Existem diversas reclamações relacionadas ao sistema Linx.',
    'Organizar as reclamações por operação, compras, estoque, precificação, relatórios, integrações, atendimento e suporte.',
    'Validar se Linx ou TOTVS oferecem automação para cotação de produtos, compras, cadastro e informações de produtos, reposição, análise comercial, estoque e fornecedores.',
    'Avaliar especificamente os módulos de compras do TOTVS.',
    'Após a reunião com o fornecedor, definir se o Grupo H2O seguirá com a contratação dos módulos necessários.',
    'O novo sistema deverá estar rodando em 1º de agosto.',
    'A implantação precisa possuir responsáveis, etapas e validações.'
  ],
  ARRAY[
    'Definir quais reclamações do Linx precisam ser resolvidas imediatamente.',
    'Confirmar quais módulos do TOTVS serão utilizados.',
    'Definir se o TOTVS atende às necessidades de compras e gestão comercial.',
    'Aprovar ou revisar o cronograma de implantação.',
    'Definir responsáveis por cadastro, testes, treinamento e conferência de dados.'
  ],
  ARRAY[
    'Elaborar o comparativo entre Linx e TOTVS.',
    'Definir a lista de módulos necessários.',
    'Montar o cronograma de implantação do novo sistema.',
    'Criar o checklist de entrada em funcionamento em 1º de agosto.',
    'Criar o plano de contingência para eventuais falhas.'
  ]
),
(
  4,
  'AUDITORIA FINANCEIRA: CARTÕES, PIX E ZÉ DELIVERY',
  'Verificar se os valores recebidos pelos diferentes meios de pagamento estão sendo corretamente registrados, conciliados e repassados.',
  ARRAY[
    'Realizar auditoria das vendas por cartão.',
    'Conferir os recebimentos por Pix.',
    'Auditar pedidos, taxas, cancelamentos e repasses do Zé Delivery.',
    'Comparar as vendas registradas no sistema com os valores efetivamente recebidos.',
    'Verificar diferenças de valores, taxas cobradas, atrasos, cancelamentos, vendas não conciliadas, registros duplicados e divergências entre caixa, sistema e banco.',
    'Avaliar se o processo atual permite identificar rapidamente as diferenças.'
  ],
  ARRAY[
    'Definir o responsável pela conciliação.',
    'Estabelecer uma rotina diária ou semanal de conferência.',
    'Definir como as divergências serão registradas e corrigidas.',
    'Criar um relatório padrão por meio de pagamento.',
    'Estabelecer prazo para regularização das diferenças.'
  ],
  ARRAY[
    'Elaborar o relatório de auditoria dos cartões.',
    'Elaborar o relatório de auditoria do Pix.',
    'Elaborar o relatório de auditoria do Zé Delivery.',
    'Consolidar a lista de divergências financeiras.',
    'Criar o processo padrão de conciliação financeira.'
  ]
),
(
  5,
  'FATURAMENTO, CUSTOS, COMPRAS E CONSTRUÇÃO DAS METAS',
  'Analisar os resultados financeiros e construir metas de faturamento coerentes para cada empresa do Grupo H2O.',
  ARRAY[
    'O faturamento precisa melhorar.',
    'Levantar os valores de todo o primeiro semestre.',
    'Comparar as vendas com o mesmo período do ano anterior.',
    'Avaliar compras versus vendas.',
    'Avaliar vendas versus custos.',
    'Incluir esses indicadores nas reuniões de segunda-feira.',
    'Construir um racional de meta de faturamento para cada empresa.',
    'Definir onde o Grupo H2O deseja chegar.',
    'Criar metas simples, mensuráveis e possíveis de acompanhar.',
    'Organizar uma análise mensal dos principais resultados.',
    'Indicadores sugeridos: faturamento total; faturamento por empresa, canal e categoria; comparação anual; compras versus vendas; vendas versus custo; margem bruta; ticket médio; crescimento mensal; atingimento das metas.'
  ],
  ARRAY[
    'Definir a meta de faturamento de cada empresa.',
    'Definir metas mensais e semanais.',
    'Estabelecer quais indicadores serão apresentados nas reuniões de segunda-feira.',
    'Definir responsáveis pela atualização dos números.',
    'Criar um modelo único de análise de resultados.'
  ],
  ARRAY[
    'Levantar o histórico financeiro do primeiro semestre.',
    'Elaborar o comparativo com o mesmo período do ano anterior.',
    'Definir as metas de faturamento por empresa.',
    'Criar o painel de indicadores financeiros e comerciais.',
    'Criar o modelo de apresentação para as reuniões de segunda-feira.'
  ]
),
(
  6,
  'VENDAS B2B, EQUIPE COMERCIAL E RECUPERAÇÃO DO BALCÃO',
  'Estruturar novas frentes comerciais, aumentar a proatividade da equipe e recuperar a força das vendas realizadas pelo balcão.',
  ARRAY[
    'Conectar Alice e Mariana à operação de vendas B2B.',
    'Criar uma rotina de contato com compradores e empresas.',
    'Preparar uma lista de potenciais clientes.',
    'Estruturar um roteiro para ligações comerciais.',
    'Definir metas de contatos, propostas e vendas.',
    'Avaliar a contratação ou designação de uma pessoa específica para vendas.',
    'Essa pessoa precisa ter estrutura, organização e proatividade.',
    'O balcão sempre foi um canal importante para o empório, mas apresentou queda.',
    'Avaliar se a redução ocorreu por atendimento, preço, mix de produtos, exposição, fluxo, abordagem da equipe, falta de acompanhamento ou concorrência.',
    'Criar um plano de recuperação do balcão.'
  ],
  ARRAY[
    'Definir a atuação de Alice e Mariana no B2B.',
    'Estabelecer metas semanais de prospecção.',
    'Definir o perfil da pessoa responsável pelas vendas.',
    'Decidir entre contratação, promoção interna ou redistribuição de funções.',
    'Criar ações para recuperar as vendas do balcão.'
  ],
  ARRAY[
    'Criar a lista de potenciais compradores.',
    'Criar o script de ligação para vendas B2B.',
    'Definir as metas de prospecção.',
    'Definir o perfil da função comercial.',
    'Criar o plano de recuperação do balcão.',
    'Criar os indicadores de vendas por canal.'
  ]
),
(
  7,
  'INSTAGRAM, WHATSAPP E NOVOS CANAIS DE RELACIONAMENTO',
  'Centralizar o atendimento, melhorar a comunicação com os clientes e organizar os canais digitais da empresa.',
  ARRAY[
    'Conversar inicialmente com a Tati para verificar sua disponibilidade para responder aos feedbacks do Instagram.',
    'Definir quais comentários, mensagens e avaliações ficarão sob responsabilidade dela.',
    'Atualmente existem quatro números diferentes de WhatsApp.',
    'Criar um canal principal de WhatsApp para toda a empresa.',
    'Direcionar automaticamente o cliente para o setor correto.',
    'Estruturar os direcionamentos para vendas, atendimento, financeiro, entregas, reclamações, fornecedores e B2B.',
    'Definir horários de atendimento e responsáveis.',
    'Avaliar uma ferramenta de atendimento com múltiplos usuários.',
    'Analisar ideias para o Projeto Chopp.',
    'Verificar como o Projeto Chopp pode se tornar um novo canal de vendas ou relacionamento.'
  ],
  ARRAY[
    'Confirmar a responsabilidade da Tati no Instagram.',
    'Definir o número principal do WhatsApp.',
    'Aprovar os setores e direcionamentos do atendimento.',
    'Definir responsáveis e horários.',
    'Selecionar uma ferramenta de centralização.',
    'Escolher quais ideias do Projeto Chopp serão aprofundadas.'
  ],
  ARRAY[
    'Criar a política de respostas do Instagram.',
    'Criar o fluxo de atendimento do WhatsApp.',
    'Definir a lista de responsáveis por setor.',
    'Definir os horários de atendimento.',
    'Elaborar a proposta inicial do Projeto Chopp.'
  ]
),
(
  8,
  'PROJETO DE VINHOS, REVISÃO DO CICLO E PRÓXIMOS PASSOS',
  'Apresentar o projeto comercial de vinhos, revisar os avanços do Ciclo 3 e definir o plano para os próximos meses.',
  ARRAY[
    'Organizar um evento exclusivo com os principais clientes de vinho.',
    'Avaliar a realização do evento em um espaço em Cataguases.',
    'Contratar ou convidar um sommelier.',
    'Apresentar os principais rótulos do empório.',
    'Fortalecer o relacionamento com os clientes.',
    'Criar oportunidades de networking.',
    'Utilizar o evento para aumentar as vendas de vinhos.',
    'Avaliar uma assinatura ou clube de vinhos ao final do evento.',
    'Criar uma estratégia de vendas antes, durante e depois do encontro.',
    'Definir quantidade de convidados, orçamento, data e formato.',
    'Verificar quais ações foram concluídas.',
    'Verificar quais atividades estão atrasadas.',
    'Confirmar os resultados das ações implantadas.',
    'Avaliar se a empresa está no caminho correto.',
    'Reforçar que o plano precisa ser executado com firmeza.',
    'Mapear tudo o que aconteceu durante o período.',
    'Criar um plano mensal de acompanhamento.',
    'Realizar uma análise mensal da operação.',
    'Definir os próximos objetivos comerciais, financeiros e operacionais.',
    'Avaliar reuniões estratégicas bimestrais após o ciclo.'
  ],
  ARRAY[
    'Aprovar ou ajustar o evento de vinhos.',
    'Definir data, local, orçamento e responsáveis.',
    'Validar a criação da assinatura ou clube de vinhos.',
    'Avaliar o cumprimento das metas do Ciclo 3.',
    'Criar um plano para os próximos 60 dias.',
    'Definir a periodicidade das próximas reuniões estratégicas.'
  ],
  ARRAY[
    'Elaborar o plano completo do evento de vinhos.',
    'Criar a estratégia para assinatura ou clube de vinhos.',
    'Elaborar o relatório de encerramento do Ciclo 3.',
    'Criar o plano de ação dos próximos 60 dias.',
    'Criar o calendário de reuniões e análises mensais.'
  ]
);

CREATE TEMP TABLE h2o_import_rows (
  task_kind text NOT NULL CHECK (task_kind IN ('main', 'delivery')),
  title text NOT NULL,
  description text NOT NULL,
  source_action_id text PRIMARY KEY
);

INSERT INTO h2o_import_rows (task_kind, title, description, source_action_id)
SELECT
  'main',
  format('Dia %s — %s', plan.day_number, plan.theme),
  concat(
    'Origem: Planejamento Ciclo 3 — Grupo H2O', E'\n',
    'Identificador de importação: h2o-ciclo3-planejamento-semanal-v1', E'\n',
    format('Identificador de origem: h2o-ciclo3-dia-%s', plan.day_number), E'\n',
    format('Semana planejada: %s', plan.day_number), E'\n\n',
    'Objetivo da reunião:', E'\n', plan.objective, E'\n\n',
    'Pontos a apresentar:', E'\n',
    (
      SELECT string_agg(format('%s. %s', point.ordinality, point.value), E'\n' ORDER BY point.ordinality)
      FROM unnest(plan.points) WITH ORDINALITY AS point(value, ordinality)
    ),
    CASE WHEN plan.day_number = 3 THEN E'\n\nMarco de implantação: 1º de agosto' ELSE '' END,
    E'\n\nControle obrigatório:', E'\n',
    'Durante esta reunião, registrar obrigatoriamente:', E'\n\n',
    '- O que será feito.', E'\n',
    '- Quem será o responsável.', E'\n',
    '- Qual será o prazo.', E'\n',
    '- Qual resultado é esperado.', E'\n',
    '- Qual indicador será acompanhado.', E'\n',
    '- Qual é a situação atual.', E'\n',
    '- O que será apresentado na reunião seguinte.', E'\n\n',
    'Estrutura recomendada da reunião:', E'\n\n',
    '1. Prestação de contas — 10 minutos:', E'\n',
    'Apresentar o que foi concluído desde a reunião anterior, o que está atrasado e quais foram os resultados.', E'\n\n',
    '2. Apresentação do tema principal — 20 minutos:', E'\n',
    'Apresentar dados, problemas, indicadores e oportunidades relacionados ao tema da semana.', E'\n\n',
    '3. Discussão e tomada de decisão — 20 minutos:', E'\n',
    'Definir o que será feito, de que forma, por quem e até quando.', E'\n\n',
    '4. Registro dos encaminhamentos — 10 minutos:', E'\n',
    'Registrar atividade, responsável, prazo, resultado esperado, indicador e situação atual.', E'\n\n',
    '5. Encerramento — 5 minutos:', E'\n',
    'Confirmar compromissos e temas que deverão ser apresentados na reunião seguinte.', E'\n\n',
    'Checklist — decisões esperadas:', E'\n',
    (
      SELECT string_agg(format('- [ ] %s', decision.value), E'\n' ORDER BY decision.ordinality)
      FROM unnest(plan.decisions) WITH ORDINALITY AS decision(value, ordinality)
    ), E'\n\n',
    format('Etiquetas: Ciclo 3 | Grupo H2O | Reunião semanal | Dia %s | %s', plan.day_number, plan.theme)
  ),
  format('h2o-ciclo3-dia-%s', plan.day_number)
FROM h2o_plan AS plan;

INSERT INTO h2o_import_rows (task_kind, title, description, source_action_id)
SELECT
  'delivery',
  delivery.value,
  concat(
    'Origem: Planejamento Ciclo 3 — Grupo H2O', E'\n',
    'Identificador de importação: h2o-ciclo3-planejamento-semanal-v1', E'\n',
    format('Identificador de origem: h2o-ciclo3-dia-%s-entregavel-%s', plan.day_number, delivery.ordinality), E'\n',
    format('Vinculada à tarefa principal: h2o-ciclo3-dia-%s', plan.day_number), E'\n',
    format('Semana planejada: %s', plan.day_number), E'\n\n',
    'Objetivo:', E'\n',
    format('Produzir o entregável “%s” para apoiar as decisões e a execução da reunião correspondente.', delivery.value), E'\n\n',
    'Resultado esperado:', E'\n',
    format('O entregável “%s” deverá estar concluído, revisado e pronto para utilização pela equipe.', delivery.value), E'\n\n',
    'Responsável:', E'\n',
    'A definir.', E'\n\n',
    'Prazo:', E'\n',
    'A definir.', E'\n\n',
    'Indicador de acompanhamento:', E'\n',
    'A definir durante a reunião correspondente.', E'\n\n',
    'Situação inicial:', E'\n',
    'Não iniciada.', E'\n\n',
    'Prestação de contas:', E'\n',
    'Apresentar o andamento ou resultado na reunião semanal seguinte.', E'\n\n',
    'Checklist:', E'\n',
    '- [ ] Definir responsável.', E'\n',
    '- [ ] Definir prazo.', E'\n',
    '- [ ] Definir resultado esperado.', E'\n',
    '- [ ] Definir indicador de acompanhamento.', E'\n',
    '- [ ] Executar a atividade.', E'\n',
    '- [ ] Registrar resultado ou evidência.', E'\n',
    '- [ ] Apresentar prestação de contas.'
  ),
  format('h2o-ciclo3-dia-%s-entregavel-%s', plan.day_number, delivery.ordinality)
FROM h2o_plan AS plan
CROSS JOIN LATERAL unnest(plan.deliveries) WITH ORDINALITY AS delivery(value, ordinality);

DO $$
BEGIN
  IF (SELECT count(*) FROM h2o_import_rows WHERE task_kind = 'main') <> 8 THEN
    RAISE EXCEPTION 'Importação interrompida: quantidade de tarefas principais diferente de 8.';
  END IF;
  IF (SELECT count(*) FROM h2o_import_rows WHERE task_kind = 'delivery') <> 41 THEN
    RAISE EXCEPTION 'Importação interrompida: quantidade de entregáveis diferente de 41.';
  END IF;
  IF (SELECT count(*) FROM h2o_import_rows) <> 49 THEN
    RAISE EXCEPTION 'Importação interrompida: quantidade total diferente de 49.';
  END IF;
END;
$$;

CREATE TEMP TABLE h2o_import_summary AS
SELECT
  count(*)::integer AS existing_before,
  0::integer AS inserted,
  0::integer AS ignored
FROM public.tasks
WHERE source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1';

CREATE TEMP TABLE h2o_inserted_tasks (
  task_id uuid PRIMARY KEY,
  source_action_id text NOT NULL UNIQUE
);

WITH inserted AS (
  INSERT INTO public.tasks (
    title,
    description,
    project_id,
    client_id,
    type,
    responsible,
    priority,
    due_date,
    status,
    task_type,
    assigned_to,
    created_by,
    start_date,
    completed_at,
    completed_by,
    previous_status,
    source_diagnostic_id,
    source_action_id
  )
  SELECT
    import_row.title,
    import_row.description,
    context.project_id,
    context.client_id,
    'Tarefa',
    NULL,
    'medium',
    NULL,
    'backlog',
    'project',
    NULL,
    context.administrator_id,
    NULL,
    NULL,
    NULL,
    NULL,
    'h2o-ciclo3-planejamento-semanal-v1',
    import_row.source_action_id
  FROM h2o_import_rows AS import_row
  CROSS JOIN h2o_import_context AS context
  ON CONFLICT (source_diagnostic_id, source_action_id)
    WHERE source_diagnostic_id IS NOT NULL AND source_action_id IS NOT NULL
  DO NOTHING
  RETURNING id, source_action_id
)
INSERT INTO h2o_inserted_tasks (task_id, source_action_id)
SELECT id, source_action_id
FROM inserted;

UPDATE h2o_import_summary
SET inserted = (SELECT count(*) FROM h2o_inserted_tasks),
    ignored = 49 - (SELECT count(*) FROM h2o_inserted_tasks);

UPDATE public.task_history AS history
SET new_value = history.new_value || jsonb_build_object(
  'project_id', context.project_id,
  'source', 'Planejamento Ciclo 3 — Grupo H2O',
  'import_id', 'h2o-ciclo3-planejamento-semanal-v1',
  'source_action_id', inserted.source_action_id,
  'created_via', 'administrative_import'
)
FROM h2o_inserted_tasks AS inserted
CROSS JOIN h2o_import_context AS context
WHERE history.task_id = inserted.task_id
  AND history.action = 'created';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tasks AS task
    CROSS JOIN h2o_import_context AS context
    WHERE task.source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1'
      AND (
        task.project_id IS DISTINCT FROM context.project_id
        OR task.client_id IS DISTINCT FROM context.client_id
        OR task.task_type <> 'project'
        OR task.status <> 'backlog'
        OR task.priority <> 'medium'
        OR task.assigned_to IS NOT NULL
        OR task.completed_at IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'Importação interrompida: uma ou mais tarefas não atendem aos campos obrigatórios.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.tasks
    WHERE source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1'
  ) <> 49 THEN
    RAISE EXCEPTION 'Importação interrompida: o total persistido não é 49.';
  END IF;
END;
$$;

COMMIT;

SELECT jsonb_build_object(
  'client', context.client_name,
  'project', context.project_name,
  'project_id', context.project_id,
  'administrator', context.administrator_name,
  'existing_before', summary.existing_before,
  'inserted', summary.inserted,
  'ignored', summary.ignored,
  'errors', 0,
  'main_tasks', (
    SELECT count(*)
    FROM public.tasks
    WHERE source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1'
      AND source_action_id ~ '^h2o-ciclo3-dia-[1-8]$'
  ),
  'delivery_tasks', (
    SELECT count(*)
    FROM public.tasks
    WHERE source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1'
      AND source_action_id ~ '^h2o-ciclo3-dia-[1-8]-entregavel-[1-6]$'
  ),
  'total_tasks', (
    SELECT count(*)
    FROM public.tasks
    WHERE source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1'
  ),
  'history_records', (
    SELECT count(*)
    FROM public.task_history AS history
    JOIN public.tasks AS task ON task.id = history.task_id
    WHERE task.source_diagnostic_id = 'h2o-ciclo3-planejamento-semanal-v1'
      AND history.action = 'created'
  )
) AS import_result
FROM h2o_import_context AS context
CROSS JOIN h2o_import_summary AS summary;
