-- Ciclo 3 do Grupo H2O. Esta migration e idempotente e nunca cria projetos.
-- As chaves de origem identificam cada tarefa independentemente do UUID gerado.

WITH target_project AS (
  SELECT id, client_id
  FROM public.projects
  WHERE lower(trim(name)) = lower('Grupo H2O - Consultoria')
  ORDER BY created_at
  LIMIT 1
), day_data(day_number, theme, objective, deliverables) AS (
  VALUES
    (1::smallint, 'Direcionamento, prioridades e velocidade nas decisões', 'Organizar as prioridades do Ciclo 3 e garantir que todas as ações tenham responsáveis, prazos e acompanhamento.', ARRAY['Plano de ação geral.','Lista de responsáveis.','Cronograma.','Relação de problemas prioritários.','Modelo de acompanhamento semanal.']),
    (2::smallint, 'Operação, FIFO, bipagem e padronização', 'Padronizar o conhecimento operacional da equipe e verificar o funcionamento dos processos básicos.', ARRAY['Cronograma de treinamento.','Material sobre FIFO e termos técnicos.','Relatório dos testes de bipagem.','Lista de erros encontrados.','Plano de correção.','Procedimento de comunicação interna.']),
    (3::smallint, 'Sistemas Linx, TOTVS e implantação', 'Avaliar os problemas do Linx, validar os módulos do TOTVS e preparar a entrada do novo sistema.', ARRAY['Comparativo Linx versus TOTVS.','Lista dos módulos necessários.','Cronograma de implantação.','Checklist para 1º de agosto.','Plano de contingência.']),
    (4::smallint, 'Auditoria financeira: cartões, Pix e Zé Delivery', 'Conferir se as vendas estão sendo registradas, conciliadas e repassadas corretamente.', ARRAY['Relatório de auditoria dos cartões.','Relatório de auditoria do Pix.','Relatório de auditoria do Zé Delivery.','Lista de divergências.','Processo padrão de conciliação financeira.']),
    (5::smallint, 'Faturamento, custos, compras e metas', 'Analisar os resultados financeiros e estabelecer metas de faturamento por empresa.', ARRAY['Histórico financeiro do primeiro semestre.','Comparativo com o ano anterior.','Metas por empresa.','Painel de indicadores.','Modelo para as reuniões de segunda-feira.']),
    (6::smallint, 'Vendas B2B, equipe comercial e recuperação do balcão', 'Desenvolver novas frentes comerciais e recuperar as vendas do balcão.', ARRAY['Lista de potenciais compradores.','Script de ligação B2B.','Metas de prospecção.','Perfil da função comercial.','Plano de recuperação do balcão.','Indicadores por canal.']),
    (7::smallint, 'Instagram, WhatsApp e novos canais', 'Organizar o atendimento digital e melhorar a comunicação com os clientes.', ARRAY['Política de respostas do Instagram.','Fluxo de atendimento pelo WhatsApp.','Lista de responsáveis por setor.','Horários de atendimento.','Proposta inicial do Projeto Chopp.']),
    (8::smallint, 'Projeto de vinhos, revisão e próximos passos', 'Estruturar o projeto comercial de vinhos, revisar o Ciclo 3 e planejar os próximos meses.', ARRAY['Plano completo do evento de vinhos.','Estratégia para assinatura ou clube de vinhos.','Relatório de encerramento do Ciclo 3.','Plano de ação para os próximos 60 dias.','Calendário de reuniões e análises mensais.'])
)
INSERT INTO public.consulting_day_plans (project_id, day_number, theme, objective, expected_decisions)
SELECT project.id, day.day_number, day.theme, day.objective, day.deliverables
FROM target_project project CROSS JOIN day_data day
ON CONFLICT (project_id, day_number) DO UPDATE SET
  theme = EXCLUDED.theme,
  objective = EXCLUDED.objective,
  expected_decisions = EXCLUDED.expected_decisions,
  updated_at = now();

WITH target_project AS (
  SELECT id, client_id
  FROM public.projects
  WHERE lower(trim(name)) = lower('Grupo H2O - Consultoria')
  ORDER BY created_at
  LIMIT 1
), task_data(day_number, task_order, title) AS (
  VALUES
    (1::smallint, 1, 'Mapear os problemas críticos que afetam preço, margem, vendas ou operação.'),
    (1::smallint, 2, 'Revisar o problema de tributação e precificação dos cigarros.'),
    (1::smallint, 3, 'Definir a ordem de prioridade das ações do Ciclo 3.'),
    (1::smallint, 4, 'Definir um responsável para cada ação.'),
    (1::smallint, 5, 'Estabelecer datas de início e prazo de conclusão.'),
    (1::smallint, 6, 'Criar um plano de ação geral para o Ciclo 3.'),
    (1::smallint, 7, 'Criar um modelo de acompanhamento semanal.'),
    (1::smallint, 8, 'Definir metas simples e objetivas para as ações.'),
    (1::smallint, 9, 'Registrar o funcionamento do novo sistema em 1º de agosto como marco do planejamento.'),
    (2::smallint, 1, 'Definir o responsável pelo treinamento de FIFO.'),
    (2::smallint, 2, 'Definir quais colaboradores participarão do treinamento.'),
    (2::smallint, 3, 'Agendar o treinamento de FIFO.'),
    (2::smallint, 4, 'Criar material básico sobre FIFO e termos técnicos do mercado.'),
    (2::smallint, 5, 'Realizar testes práticos no processo de bipagem.'),
    (2::smallint, 6, 'Verificar se a bipagem está efetivamente ativa.'),
    (2::smallint, 7, 'Testar se o sistema apresenta o produto correto durante a bipagem.'),
    (2::smallint, 8, 'Registrar os erros encontrados no processo.'),
    (2::smallint, 9, 'Criar um plano de correção para os problemas da bipagem.'),
    (2::smallint, 10, 'Comunicar oficialmente ao Chicão e à liderança a situação atual da bipagem.'),
    (2::smallint, 11, 'Criar um procedimento de comunicação interna para mudanças de sistemas e processos.'),
    (3::smallint, 1, 'Levantar todas as reclamações relacionadas ao Linx.'),
    (3::smallint, 2, 'Separar as reclamações por operação, compras, estoque, precificação, relatórios, integrações e suporte.'),
    (3::smallint, 3, 'Identificar quais problemas do Linx precisam de resolução imediata.'),
    (3::smallint, 4, 'Verificar os recursos de automação disponíveis no Linx e no TOTVS.'),
    (3::smallint, 5, 'Avaliar o módulo de compras do TOTVS.'),
    (3::smallint, 6, 'Verificar se o TOTVS atende às necessidades comerciais e operacionais.'),
    (3::smallint, 7, 'Definir quais módulos do TOTVS serão utilizados.'),
    (3::smallint, 8, 'Elaborar um comparativo entre Linx e TOTVS.'),
    (3::smallint, 9, 'Definir responsáveis por cadastro, testes, treinamento e conferência dos dados.'),
    (3::smallint, 10, 'Criar o cronograma de implantação do novo sistema.'),
    (3::smallint, 11, 'Criar um checklist para a entrada em funcionamento em 1º de agosto.'),
    (3::smallint, 12, 'Criar um plano de contingência para possíveis falhas.'),
    (4::smallint, 1, 'Auditar as vendas realizadas por cartão.'),
    (4::smallint, 2, 'Conferir os recebimentos realizados por Pix.'),
    (4::smallint, 3, 'Auditar pedidos, taxas, cancelamentos e repasses do Zé Delivery.'),
    (4::smallint, 4, 'Comparar as vendas do sistema com os valores recebidos no banco.'),
    (4::smallint, 5, 'Verificar taxas cobradas e atrasos nos repasses.'),
    (4::smallint, 6, 'Identificar vendas não conciliadas.'),
    (4::smallint, 7, 'Identificar registros duplicados e cancelamentos divergentes.'),
    (4::smallint, 8, 'Registrar as diferenças entre caixa, sistema e banco.'),
    (4::smallint, 9, 'Definir o responsável pela conciliação financeira.'),
    (4::smallint, 10, 'Estabelecer uma rotina diária ou semanal de conferência.'),
    (4::smallint, 11, 'Criar um relatório padrão para cada meio de pagamento.'),
    (4::smallint, 12, 'Definir prazo para correção das divergências.'),
    (5::smallint, 1, 'Levantar o faturamento de todo o primeiro semestre.'),
    (5::smallint, 2, 'Separar o faturamento por empresa, canal e categoria.'),
    (5::smallint, 3, 'Comparar os resultados com o mesmo período do ano anterior.'),
    (5::smallint, 4, 'Analisar compras versus vendas.'),
    (5::smallint, 5, 'Analisar vendas versus custos.'),
    (5::smallint, 6, 'Calcular margem bruta, ticket médio e crescimento mensal.'),
    (5::smallint, 7, 'Construir uma meta de faturamento para cada empresa.'),
    (5::smallint, 8, 'Dividir as metas em períodos mensais e semanais.'),
    (5::smallint, 9, 'Definir os indicadores que serão acompanhados.'),
    (5::smallint, 10, 'Definir os responsáveis pela atualização dos indicadores.'),
    (5::smallint, 11, 'Criar um painel de acompanhamento dos resultados.'),
    (5::smallint, 12, 'Criar um modelo de apresentação para as reuniões de segunda-feira.'),
    (5::smallint, 13, 'Incluir compras versus vendas e vendas versus custos nas reuniões semanais.'),
    (5::smallint, 14, 'Criar uma rotina mensal de análise financeira.'),
    (6::smallint, 1, 'Definir a atuação de Alice e Mariana nas vendas B2B.'),
    (6::smallint, 2, 'Criar uma lista de potenciais compradores e empresas.'),
    (6::smallint, 3, 'Estruturar um roteiro de ligação comercial B2B.'),
    (6::smallint, 4, 'Criar uma rotina de prospecção.'),
    (6::smallint, 5, 'Definir metas semanais de contatos, propostas e vendas.'),
    (6::smallint, 6, 'Definir o perfil necessário para a função comercial.'),
    (6::smallint, 7, 'Avaliar contratação, promoção interna ou redistribuição de funções.'),
    (6::smallint, 8, 'Levantar o histórico de vendas do balcão.'),
    (6::smallint, 9, 'Identificar as causas da queda nas vendas do balcão.'),
    (6::smallint, 10, 'Avaliar atendimento, preço, mix, exposição, fluxo, abordagem e concorrência.'),
    (6::smallint, 11, 'Criar ações para recuperação do balcão.'),
    (6::smallint, 12, 'Definir indicadores de vendas por canal.'),
    (6::smallint, 13, 'Criar um plano de recuperação das vendas do balcão.'),
    (7::smallint, 1, 'Conversar com a Tati sobre a gestão dos feedbacks do Instagram.'),
    (7::smallint, 2, 'Definir quais comentários, mensagens e avaliações serão respondidos por ela.'),
    (7::smallint, 3, 'Criar uma política de respostas para o Instagram.'),
    (7::smallint, 4, 'Escolher um número principal de WhatsApp.'),
    (7::smallint, 5, 'Mapear os quatro números utilizados atualmente.'),
    (7::smallint, 6, 'Criar um fluxo centralizado de atendimento pelo WhatsApp.'),
    (7::smallint, 7, 'Definir os direcionamentos para cada setor.'),
    (7::smallint, 8, 'Definir responsáveis e horários de atendimento.'),
    (7::smallint, 9, 'Avaliar ferramentas de WhatsApp com múltiplos atendentes.'),
    (7::smallint, 10, 'Selecionar a ferramenta de centralização.'),
    (7::smallint, 11, 'Analisar as ideias existentes para o Projeto Chopp.'),
    (7::smallint, 12, 'Avaliar como o Projeto Chopp pode gerar vendas e relacionamento.'),
    (7::smallint, 13, 'Elaborar uma proposta inicial para o Projeto Chopp.'),
    (8::smallint, 1, 'Definir o objetivo e o formato do evento de vinhos.'),
    (8::smallint, 2, 'Levantar possíveis espaços em Cataguases.'),
    (8::smallint, 3, 'Definir data, local, orçamento e quantidade de convidados.'),
    (8::smallint, 4, 'Selecionar ou convidar um sommelier.'),
    (8::smallint, 5, 'Escolher os rótulos que serão apresentados.'),
    (8::smallint, 6, 'Criar uma estratégia de vendas antes, durante e depois do evento.'),
    (8::smallint, 7, 'Criar ações de relacionamento e networking.'),
    (8::smallint, 8, 'Avaliar a criação de uma assinatura ou clube de vinhos.'),
    (8::smallint, 9, 'Definir responsáveis pela organização do evento.'),
    (8::smallint, 10, 'Verificar quais ações do Ciclo 3 foram concluídas.'),
    (8::smallint, 11, 'Identificar as tarefas atrasadas.'),
    (8::smallint, 12, 'Avaliar os resultados das ações implantadas.'),
    (8::smallint, 13, 'Elaborar o relatório de encerramento do Ciclo 3.'),
    (8::smallint, 14, 'Criar um plano de ação para os próximos 60 dias.'),
    (8::smallint, 15, 'Criar um calendário de reuniões e análises mensais.'),
    (8::smallint, 16, 'Definir os próximos objetivos comerciais, financeiros e operacionais.'),
    (8::smallint, 17, 'Avaliar a realização de reuniões estratégicas bimestrais.')
), prepared AS (
  SELECT
    project.id AS project_id,
    project.client_id,
    task.day_number,
    task.task_order,
    task.title,
    format('h2o-ciclo3-dia-%s-tarefa-%s', task.day_number, lpad(task.task_order::text, 2, '0')) AS source_action_id
  FROM target_project project CROSS JOIN task_data task
)
INSERT INTO public.tasks (
  project_id, client_id, title, type, priority, status, task_type,
  responsible, assigned_to, start_date, due_date, consulting_day,
  source_diagnostic_id, source_action_id, evidence_required
)
SELECT
  project_id, client_id, title, 'processo', 'medium', 'backlog', 'project',
  NULL, NULL, NULL, NULL, day_number,
  'h2o-ciclo3-plano-acao-v1', source_action_id, false
FROM prepared
ON CONFLICT (source_diagnostic_id, source_action_id) WHERE source_diagnostic_id IS NOT NULL AND source_action_id IS NOT NULL
DO UPDATE SET
  project_id = EXCLUDED.project_id,
  client_id = EXCLUDED.client_id,
  title = EXCLUDED.title,
  consulting_day = EXCLUDED.consulting_day,
  updated_at = now();
