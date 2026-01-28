-- Template 1: Diagnóstico de Compras JoIA
INSERT INTO public.diagnostic_templates (id, name, description) VALUES
('b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Diagnóstico de Compras JoIA', '{"version": "1.0", "area": "compras", "status": "published", "estimatedTime": "45min"}'::jsonb);

INSERT INTO public.template_sections (id, template_id, title, description, position, weight) VALUES
('c1a00001-a001-4001-b001-000000000001', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Governança e Fluxo de Aprovação', 'Avaliação dos processos de aprovação e governança de compras', 0, 15),
('c1a00001-a001-4001-b001-000000000002', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Planejamento de Compra e Demanda', 'Análise do planejamento e previsão de demanda', 1, 20),
('c1a00001-a001-4001-b001-000000000003', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Cadastro e Curva ABC', 'Avaliação da gestão de cadastros e classificação de itens', 2, 15),
('c1a00001-a001-4001-b001-000000000004', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Fornecedores e Negociação', 'Análise da gestão de fornecedores e processos de negociação', 3, 20),
('c1a00001-a001-4001-b001-000000000005', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Pedido e Recebimento', 'Avaliação do fluxo de pedidos e recebimento de materiais', 4, 15),
('c1a00001-a001-4001-b001-000000000006', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Custo Real e Margem', 'Análise de custos e impacto na margem', 5, 15);

INSERT INTO public.template_questions (id, template_id, section_id, title, description, type, position, weight, required, criticality, helper_text, options) VALUES
('d1a00001-a001-4001-b001-000000000001', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000001', 'Existe política de compras formalizada?', 'Documento que define regras, alçadas e responsabilidades', 'yes_no', 0, 1, true, 'alta', 'Anexe a política caso exista', NULL),
('d1a00001-a001-4001-b001-000000000002', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000001', 'Quais são as alçadas de aprovação por valor?', 'Descreva os limites de aprovação', 'text', 1, 1, true, 'alta', NULL, NULL),
('d1a00001-a001-4001-b001-000000000003', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000001', 'As compras emergenciais são rastreadas?', 'Controle de compras fora do fluxo normal', 'yes_no', 2, 1, true, 'media', NULL, NULL),
('d1a00001-a001-4001-b001-000000000004', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000002', 'Existe previsão de demanda estruturada?', 'Processo formal de forecast', 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d1a00001-a001-4001-b001-000000000005', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000002', 'Qual a frequência de revisão do planejamento?', NULL, 'multiple_choice', 1, 1, true, 'media', NULL, '[{"label": "Semanal", "weight": 3}, {"label": "Quinzenal", "weight": 2}, {"label": "Mensal", "weight": 1}, {"label": "Não há frequência definida", "weight": 0}]'),
('d1a00001-a001-4001-b001-000000000006', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000002', 'O lead time dos fornecedores é considerado?', NULL, 'yes_no', 2, 1, true, 'alta', NULL, NULL),
('d1a00001-a001-4001-b001-000000000007', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000003', 'Existe classificação ABC de itens?', 'Priorização por valor/criticidade', 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d1a00001-a001-4001-b001-000000000008', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000003', 'O cadastro de materiais está padronizado?', NULL, 'scale', 1, 1, true, 'media', '1=Sem padrão, 10=Totalmente padronizado', NULL),
('d1a00001-a001-4001-b001-000000000009', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000003', 'Há controle de itens obsoletos?', NULL, 'yes_no', 2, 1, true, 'media', NULL, NULL),
('d1a00001-a001-4001-b001-000000000010', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000004', 'Quantos fornecedores homologados existem?', NULL, 'number', 0, 1, true, 'media', NULL, NULL),
('d1a00001-a001-4001-b001-000000000011', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000004', 'Existe processo de homologação de fornecedores?', NULL, 'yes_no', 1, 1, true, 'alta', NULL, NULL),
('d1a00001-a001-4001-b001-000000000012', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000004', 'Como é feita a avaliação de fornecedores?', NULL, 'multiple_choice', 2, 1, true, 'alta', NULL, '[{"label": "Indicadores formais", "weight": 3}, {"label": "Avaliação informal", "weight": 1}, {"label": "Não há avaliação", "weight": 0}]'),
('d1a00001-a001-4001-b001-000000000013', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000005', 'Existe conferência cega no recebimento?', NULL, 'yes_no', 0, 1, true, 'alta', 'Conferência sem acesso à nota fiscal', NULL),
('d1a00001-a001-4001-b001-000000000014', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000005', 'Os prazos de entrega são monitorados?', NULL, 'yes_no', 1, 1, true, 'media', NULL, NULL),
('d1a00001-a001-4001-b001-000000000015', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000005', 'Qual o percentual médio de devolução?', NULL, 'number', 2, 1, false, 'media', 'Em percentual', NULL),
('d1a00001-a001-4001-b001-000000000016', 'b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'c1a00001-a001-4001-b001-000000000006', 'O custo de aquisição é apurado corretamente?', 'Inclui frete, impostos, etc.', 'yes_no', 0, 1, true, 'alta', NULL, NULL);

-- Template 2: Diagnóstico de Finanças JoIA
INSERT INTO public.diagnostic_templates (id, name, description) VALUES
('b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'Diagnóstico de Finanças JoIA', '{"version": "1.0", "area": "financas", "status": "published", "estimatedTime": "40min"}'::jsonb);

INSERT INTO public.template_sections (id, template_id, title, description, position, weight) VALUES
('c2a00001-a001-4001-b001-000000000001', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'Gestão de Fluxo de Caixa', 'Avaliação do controle e projeção de caixa', 0, 20),
('c2a00001-a001-4001-b001-000000000002', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'Contas a Pagar e Receber', 'Análise dos processos de contas', 1, 20),
('c2a00001-a001-4001-b001-000000000003', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'Conciliação e Fechamento', 'Avaliação dos processos de conciliação', 2, 20),
('c2a00001-a001-4001-b001-000000000004', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'Orçamento e Planejamento', 'Análise do processo orçamentário', 3, 20),
('c2a00001-a001-4001-b001-000000000005', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'Indicadores e Relatórios', 'Avaliação dos KPIs financeiros', 4, 20);

INSERT INTO public.template_questions (id, template_id, section_id, title, description, type, position, weight, required, criticality, helper_text, options) VALUES
('d2a00001-a001-4001-b001-000000000001', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000001', 'Existe projeção de fluxo de caixa?', NULL, 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d2a00001-a001-4001-b001-000000000002', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000001', 'Qual o horizonte de projeção?', NULL, 'multiple_choice', 1, 1, true, 'media', NULL, '[{"label": "30 dias", "weight": 1}, {"label": "60 dias", "weight": 2}, {"label": "90 dias ou mais", "weight": 3}, {"label": "Não há projeção", "weight": 0}]'),
('d2a00001-a001-4001-b001-000000000003', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000001', 'O caixa é reconciliado diariamente?', NULL, 'yes_no', 2, 1, true, 'alta', NULL, NULL),
('d2a00001-a001-4001-b001-000000000004', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000002', 'Qual o índice de inadimplência?', NULL, 'number', 0, 1, true, 'alta', 'Em percentual', NULL),
('d2a00001-a001-4001-b001-000000000005', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000002', 'Existe política de cobrança estruturada?', NULL, 'yes_no', 1, 1, true, 'alta', NULL, NULL),
('d2a00001-a001-4001-b001-000000000006', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000002', 'Os pagamentos são aprovados em múltiplos níveis?', NULL, 'yes_no', 2, 1, true, 'media', NULL, NULL),
('d2a00001-a001-4001-b001-000000000007', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000003', 'As contas bancárias são conciliadas?', NULL, 'multiple_choice', 0, 1, true, 'alta', NULL, '[{"label": "Diariamente", "weight": 3}, {"label": "Semanalmente", "weight": 2}, {"label": "Mensalmente", "weight": 1}, {"label": "Não há conciliação", "weight": 0}]'),
('d2a00001-a001-4001-b001-000000000008', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000003', 'O fechamento contábil é feito até que dia?', NULL, 'number', 1, 1, true, 'media', 'Dia do mês seguinte', NULL),
('d2a00001-a001-4001-b001-000000000009', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000004', 'Existe orçamento anual formalizado?', NULL, 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d2a00001-a001-4001-b001-000000000010', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000004', 'É feito acompanhamento orçado vs realizado?', NULL, 'yes_no', 1, 1, true, 'alta', NULL, NULL),
('d2a00001-a001-4001-b001-000000000011', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000005', 'Quais indicadores financeiros são acompanhados?', NULL, 'text', 0, 1, true, 'media', 'Liste os principais KPIs', NULL),
('d2a00001-a001-4001-b001-000000000012', 'b2b2c3d4-e5f6-7890-abcd-ef1234567892', 'c2a00001-a001-4001-b001-000000000005', 'Avalie a maturidade dos relatórios gerenciais', NULL, 'scale', 1, 1, true, 'media', '1=Básico, 10=Avançado', NULL);

-- Template 3: Diagnóstico de Estoque JoIA
INSERT INTO public.diagnostic_templates (id, name, description) VALUES
('b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'Diagnóstico de Estoque JoIA', '{"version": "1.0", "area": "estoque", "status": "published", "estimatedTime": "35min"}'::jsonb);

INSERT INTO public.template_sections (id, template_id, title, description, position, weight) VALUES
('c3a00001-a001-4001-b001-000000000001', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'Controle e Acuracidade', 'Avaliação da precisão do estoque', 0, 25),
('c3a00001-a001-4001-b001-000000000002', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'Movimentação e Armazenagem', 'Análise dos processos de movimentação', 1, 25),
('c3a00001-a001-4001-b001-000000000003', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'Níveis e Reposição', 'Avaliação das políticas de estoque', 2, 25),
('c3a00001-a001-4001-b001-000000000004', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'Inventário e Perdas', 'Análise de inventários e controle de perdas', 3, 25);

INSERT INTO public.template_questions (id, template_id, section_id, title, description, type, position, weight, required, criticality, helper_text, options) VALUES
('d3a00001-a001-4001-b001-000000000001', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000001', 'Qual a acuracidade atual do estoque?', NULL, 'number', 0, 1, true, 'alta', 'Em percentual', NULL),
('d3a00001-a001-4001-b001-000000000002', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000001', 'Existe sistema de gestão de estoque (WMS)?', NULL, 'yes_no', 1, 1, true, 'alta', NULL, NULL),
('d3a00001-a001-4001-b001-000000000003', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000001', 'Os endereços de armazenagem são controlados?', NULL, 'yes_no', 2, 1, true, 'media', NULL, NULL),
('d3a00001-a001-4001-b001-000000000004', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000002', 'As entradas são registradas em tempo real?', NULL, 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d3a00001-a001-4001-b001-000000000005', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000002', 'As saídas são registradas em tempo real?', NULL, 'yes_no', 1, 1, true, 'alta', NULL, NULL),
('d3a00001-a001-4001-b001-000000000006', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000002', 'O layout do armazém é otimizado?', NULL, 'scale', 2, 1, true, 'media', '1=Desordenado, 10=Otimizado', NULL),
('d3a00001-a001-4001-b001-000000000007', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000003', 'Existem pontos de pedido definidos?', NULL, 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d3a00001-a001-4001-b001-000000000008', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000003', 'O estoque de segurança é calculado?', NULL, 'yes_no', 1, 1, true, 'alta', NULL, NULL),
('d3a00001-a001-4001-b001-000000000009', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000003', 'Qual o giro médio do estoque?', NULL, 'number', 2, 1, true, 'media', 'Vezes por ano', NULL),
('d3a00001-a001-4001-b001-000000000010', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000004', 'Qual a frequência do inventário?', NULL, 'multiple_choice', 0, 1, true, 'alta', NULL, '[{"label": "Cíclico/Contínuo", "weight": 3}, {"label": "Semestral", "weight": 2}, {"label": "Anual", "weight": 1}, {"label": "Não realiza", "weight": 0}]'),
('d3a00001-a001-4001-b001-000000000011', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000004', 'Qual o índice de perdas/quebras?', NULL, 'number', 1, 1, true, 'alta', 'Em percentual do estoque', NULL),
('d3a00001-a001-4001-b001-000000000012', 'b3b2c3d4-e5f6-7890-abcd-ef1234567893', 'c3a00001-a001-4001-b001-000000000004', 'Há controle de validade (FIFO/FEFO)?', NULL, 'yes_no', 2, 1, true, 'media', NULL, NULL);

-- Template 4: Diagnóstico de Operações JoIA
INSERT INTO public.diagnostic_templates (id, name, description) VALUES
('b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'Diagnóstico de Operações JoIA', '{"version": "1.0", "area": "operacoes", "status": "published", "estimatedTime": "50min"}'::jsonb);

INSERT INTO public.template_sections (id, template_id, title, description, position, weight) VALUES
('c4a00001-a001-4001-b001-000000000001', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'Processos e Padronização', 'Avaliação da maturidade de processos', 0, 20),
('c4a00001-a001-4001-b001-000000000002', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'Produtividade e Capacidade', 'Análise da eficiência operacional', 1, 20),
('c4a00001-a001-4001-b001-000000000003', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'Qualidade e Controle', 'Avaliação do sistema de qualidade', 2, 20),
('c4a00001-a001-4001-b001-000000000004', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'Manutenção e Ativos', 'Análise da gestão de ativos', 3, 20),
('c4a00001-a001-4001-b001-000000000005', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'Indicadores Operacionais', 'Avaliação dos KPIs de operação', 4, 20);

INSERT INTO public.template_questions (id, template_id, section_id, title, description, type, position, weight, required, criticality, helper_text, options) VALUES
('d4a00001-a001-4001-b001-000000000001', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000001', 'Os processos críticos estão documentados?', NULL, 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d4a00001-a001-4001-b001-000000000002', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000001', 'Qual o nível de padronização?', NULL, 'scale', 1, 1, true, 'alta', '1=Nenhum, 10=Totalmente padronizado', NULL),
('d4a00001-a001-4001-b001-000000000003', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000001', 'Existem POPs (Procedimentos Operacionais)?', NULL, 'yes_no', 2, 1, true, 'media', NULL, NULL),
('d4a00001-a001-4001-b001-000000000004', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000002', 'A capacidade produtiva é medida?', NULL, 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d4a00001-a001-4001-b001-000000000005', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000002', 'Qual o nível de ocupação médio?', NULL, 'number', 1, 1, true, 'media', 'Em percentual', NULL),
('d4a00001-a001-4001-b001-000000000006', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000002', 'Os gargalos são identificados e tratados?', NULL, 'yes_no', 2, 1, true, 'alta', NULL, NULL),
('d4a00001-a001-4001-b001-000000000007', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000003', 'Existe sistema de gestão da qualidade?', NULL, 'multiple_choice', 0, 1, true, 'alta', NULL, '[{"label": "Certificado (ISO, etc)", "weight": 3}, {"label": "Implementado informalmente", "weight": 2}, {"label": "Em implantação", "weight": 1}, {"label": "Não existe", "weight": 0}]'),
('d4a00001-a001-4001-b001-000000000008', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000003', 'O índice de retrabalho é medido?', NULL, 'yes_no', 1, 1, true, 'media', NULL, NULL),
('d4a00001-a001-4001-b001-000000000009', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000003', 'Qual o índice de defeitos/não conformidades?', NULL, 'number', 2, 1, true, 'alta', 'Em percentual', NULL),
('d4a00001-a001-4001-b001-000000000010', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000004', 'Existe plano de manutenção preventiva?', NULL, 'yes_no', 0, 1, true, 'alta', NULL, NULL),
('d4a00001-a001-4001-b001-000000000011', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000004', 'Qual o índice de disponibilidade dos equipamentos?', NULL, 'number', 1, 1, true, 'media', 'Em percentual', NULL),
('d4a00001-a001-4001-b001-000000000012', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000004', 'Os custos de manutenção são controlados?', NULL, 'yes_no', 2, 1, true, 'media', NULL, NULL),
('d4a00001-a001-4001-b001-000000000013', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000005', 'Quais KPIs operacionais são monitorados?', NULL, 'text', 0, 1, true, 'media', 'Liste os principais indicadores', NULL),
('d4a00001-a001-4001-b001-000000000014', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000005', 'Existe dashboard de operações?', NULL, 'yes_no', 1, 1, true, 'media', NULL, NULL),
('d4a00001-a001-4001-b001-000000000015', 'b4b2c3d4-e5f6-7890-abcd-ef1234567894', 'c4a00001-a001-4001-b001-000000000005', 'Avalie a maturidade da gestão operacional', NULL, 'scale', 2, 1, true, 'alta', '1=Inicial, 10=Excelência operacional', NULL);