-- Reestruturar template Onboarding JoIA com perguntas fechadas e scoring por área
-- Fórmula: Score Área = (Sintomas × Peso) + Dor Declarada + Penalidades Críticas

-- Primeiro, remover perguntas e seções antigas do Onboarding JoIA
DELETE FROM template_opportunity_rules WHERE template_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM template_questions WHERE template_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM template_sections WHERE template_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Atualizar descrição do template
UPDATE diagnostic_templates 
SET description = '{"description": "Diagnóstico inicial estruturado para identificar a área prioritária de atuação. Score calculado por área: (Sintomas × Peso) + Dor Declarada + Penalidades Críticas. A área com maior score indica a dor principal.", "tags": ["onboarding", "kickoff", "priorização"], "status": "published", "version": "v2.0", "estimatedTimeMinutes": 15}'::jsonb,
    updated_at = now()
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- =============================================
-- SEÇÃO 1: Contexto do Negócio (peso 0.5 - apenas contexto)
-- =============================================
INSERT INTO template_sections (id, template_id, title, description, position, weight) VALUES
('b1000001-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Contexto do Negócio', 'Informações gerais sobre a empresa para contextualização', 0, 0.5);

INSERT INTO template_questions (id, template_id, section_id, title, description, type, weight, criticality, required, position, options, min_value, max_value) VALUES
('c1000001-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000001', 
 'Qual o segmento principal da empresa?', 
 'Contexto para entender o perfil do cliente',
 'select', 1, 'media', true, 0, 
 '[{"label": "Comércio/Varejo", "weight": 1}, {"label": "Indústria", "weight": 1}, {"label": "Serviços", "weight": 1}, {"label": "Distribuição/Atacado", "weight": 1}, {"label": "Outro", "weight": 1}]'::jsonb, 
 NULL, NULL),
('c1000001-0001-0001-0001-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000001', 
 'Quantos colaboradores a empresa possui?', 
 'Dimensionamento da operação',
 'select', 1, 'media', true, 1, 
 '[{"label": "Até 10", "weight": 1}, {"label": "11 a 50", "weight": 1}, {"label": "51 a 200", "weight": 1}, {"label": "Mais de 200", "weight": 1}]'::jsonb, 
 NULL, NULL);

-- =============================================
-- SEÇÃO 2: Dor Declarada por Área (peso 3 cada - alta importância)
-- Área com maior score de dor recebe prioridade
-- =============================================
INSERT INTO template_sections (id, template_id, title, description, position, weight) VALUES
('b1000001-0001-0001-0001-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dor Declarada por Área', 'Avalie de 1 a 10 o quanto cada área está causando dor/problema no negócio', 1, 3);

INSERT INTO template_questions (id, template_id, section_id, title, description, type, weight, criticality, required, position, options, min_value, max_value, helper_text) VALUES
('c1000001-0001-0001-0001-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000002', 
 'Quanto a área de COMPRAS está causando dor no negócio?', 
 'Considere: fornecedores, preços, prazos, qualidade de insumos',
 'rating', 3, 'alta', true, 0, NULL, 1, 10, '1 = Sem dor / 10 = Dor crítica'),
('c1000001-0001-0001-0001-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000002', 
 'Quanto a área de FINANÇAS está causando dor no negócio?', 
 'Considere: fluxo de caixa, controles, inadimplência, custos',
 'rating', 3, 'alta', true, 1, NULL, 1, 10, '1 = Sem dor / 10 = Dor crítica'),
('c1000001-0001-0001-0001-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000002', 
 'Quanto a área de ESTOQUE está causando dor no negócio?', 
 'Considere: ruptura, excesso, acurácia, perdas',
 'rating', 3, 'alta', true, 2, NULL, 1, 10, '1 = Sem dor / 10 = Dor crítica'),
('c1000001-0001-0001-0001-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000002', 
 'Quanto a área de OPERAÇÕES está causando dor no negócio?', 
 'Considere: produtividade, processos, qualidade, retrabalho',
 'rating', 3, 'alta', true, 3, NULL, 1, 10, '1 = Sem dor / 10 = Dor crítica');

-- =============================================
-- SEÇÃO 3: Sintomas - COMPRAS (peso 2 cada sintoma)
-- =============================================
INSERT INTO template_sections (id, template_id, title, description, position, weight) VALUES
('b1000001-0001-0001-0001-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sintomas - Compras', 'Marque os problemas que ocorrem na área de Compras', 2, 2);

INSERT INTO template_questions (id, template_id, section_id, title, description, type, weight, criticality, required, position, options, min_value, max_value) VALUES
('c1000001-0001-0001-0001-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000003', 
 'Quais problemas de COMPRAS ocorrem na empresa?', 
 'Selecione todos que se aplicam. Cada item marcado aumenta o score da área.',
 'select', 2, 'alta', true, 0, 
 '[{"label": "Falta de cotação/comparação de preços", "weight": 2}, {"label": "Compras emergenciais frequentes", "weight": 3}, {"label": "Dependência de poucos fornecedores", "weight": 2}, {"label": "Atrasos de entrega recorrentes", "weight": 2}, {"label": "Não existe curva ABC de compras", "weight": 2}, {"label": "Sem controle de pedidos em aberto", "weight": 2}, {"label": "Compras sem aprovação formal", "weight": 3}]'::jsonb, 
 NULL, NULL);

-- =============================================
-- SEÇÃO 4: Sintomas - FINANÇAS (peso 2 cada sintoma)
-- =============================================
INSERT INTO template_sections (id, template_id, title, description, position, weight) VALUES
('b1000001-0001-0001-0001-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sintomas - Finanças', 'Marque os problemas que ocorrem na área de Finanças', 3, 2);

INSERT INTO template_questions (id, template_id, section_id, title, description, type, weight, criticality, required, position, options, min_value, max_value) VALUES
('c1000001-0001-0001-0001-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000004', 
 'Quais problemas de FINANÇAS ocorrem na empresa?', 
 'Selecione todos que se aplicam. Cada item marcado aumenta o score da área.',
 'select', 2, 'alta', true, 0, 
 '[{"label": "Fluxo de caixa não é projetado", "weight": 3}, {"label": "Inadimplência acima de 5%", "weight": 3}, {"label": "Conciliação bancária atrasada", "weight": 2}, {"label": "Não há separação de contas PJ/PF", "weight": 3}, {"label": "Sem DRE ou análise de resultados", "weight": 2}, {"label": "Custos não são apurados por produto/serviço", "weight": 2}, {"label": "Pagamentos em atraso frequentes", "weight": 2}]'::jsonb, 
 NULL, NULL);

-- =============================================
-- SEÇÃO 5: Sintomas - ESTOQUE (peso 2 cada sintoma)
-- =============================================
INSERT INTO template_sections (id, template_id, title, description, position, weight) VALUES
('b1000001-0001-0001-0001-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sintomas - Estoque', 'Marque os problemas que ocorrem na área de Estoque', 4, 2);

INSERT INTO template_questions (id, template_id, section_id, title, description, type, weight, criticality, required, position, options, min_value, max_value) VALUES
('c1000001-0001-0001-0001-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000005', 
 'Quais problemas de ESTOQUE ocorrem na empresa?', 
 'Selecione todos que se aplicam. Cada item marcado aumenta o score da área.',
 'select', 2, 'alta', true, 0, 
 '[{"label": "Rupturas de estoque frequentes", "weight": 3}, {"label": "Estoque físico difere do sistema", "weight": 3}, {"label": "Produtos vencendo ou obsoletos", "weight": 2}, {"label": "Sem curva ABC de produtos", "weight": 2}, {"label": "Inventário não é feito regularmente", "weight": 2}, {"label": "Armazém desorganizado", "weight": 2}, {"label": "Perdas/furtos recorrentes", "weight": 3}]'::jsonb, 
 NULL, NULL);

-- =============================================
-- SEÇÃO 6: Sintomas - OPERAÇÕES (peso 2 cada sintoma)
-- =============================================
INSERT INTO template_sections (id, template_id, title, description, position, weight) VALUES
('b1000001-0001-0001-0001-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sintomas - Operações', 'Marque os problemas que ocorrem na área de Operações', 5, 2);

INSERT INTO template_questions (id, template_id, section_id, title, description, type, weight, criticality, required, position, options, min_value, max_value) VALUES
('c1000001-0001-0001-0001-000000000010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000006', 
 'Quais problemas de OPERAÇÕES ocorrem na empresa?', 
 'Selecione todos que se aplicam. Cada item marcado aumenta o score da área.',
 'select', 2, 'alta', true, 0, 
 '[{"label": "Processos não estão documentados", "weight": 2}, {"label": "Alto índice de retrabalho", "weight": 3}, {"label": "Reclamações de clientes frequentes", "weight": 3}, {"label": "Produtividade abaixo do esperado", "weight": 2}, {"label": "Equipamentos sem manutenção preventiva", "weight": 2}, {"label": "Indicadores não são acompanhados", "weight": 2}, {"label": "Alta rotatividade de pessoal", "weight": 2}]'::jsonb, 
 NULL, NULL);

-- =============================================
-- SEÇÃO 7: Penalidades Críticas (peso 5 - situações graves)
-- =============================================
INSERT INTO template_sections (id, template_id, title, description, position, weight) VALUES
('b1000001-0001-0001-0001-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Penalidades Críticas', 'Situações graves que indicam urgência na área', 6, 5);

INSERT INTO template_questions (id, template_id, section_id, title, description, type, weight, criticality, required, position, options, min_value, max_value) VALUES
('c1000001-0001-0001-0001-000000000011', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000007', 
 'A empresa já teve PARADA de produção/operação por falta de insumos?', 
 'Penalidade crítica para área de Compras/Estoque',
 'boolean', 5, 'alta', true, 0, NULL, NULL, NULL),
('c1000001-0001-0001-0001-000000000012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000007', 
 'A empresa já ficou com NOME SUJO ou protestos por dívidas?', 
 'Penalidade crítica para área de Finanças',
 'boolean', 5, 'alta', true, 1, NULL, NULL, NULL),
('c1000001-0001-0001-0001-000000000013', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000007', 
 'A empresa já PERDEU CLIENTE IMPORTANTE por problemas de qualidade?', 
 'Penalidade crítica para área de Operações',
 'boolean', 5, 'alta', true, 2, NULL, NULL, NULL),
('c1000001-0001-0001-0001-000000000014', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000007', 
 'A empresa já teve PERDA SIGNIFICATIVA de estoque (vencimento, furto, avaria)?', 
 'Penalidade crítica para área de Estoque',
 'boolean', 5, 'alta', true, 3, NULL, NULL, NULL);

-- =============================================
-- SEÇÃO 8: Expectativa e Próximos Passos
-- =============================================
INSERT INTO template_sections (id, template_id, title, description, position, weight) VALUES
('b1000001-0001-0001-0001-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Expectativa e Próximos Passos', 'Validação final e alinhamento', 7, 1);

INSERT INTO template_questions (id, template_id, section_id, title, description, type, weight, criticality, required, position, options, min_value, max_value) VALUES
('c1000001-0001-0001-0001-000000000015', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000008', 
 'Qual o resultado esperado com este projeto de consultoria?', 
 'Entender a expectativa do cliente',
 'text', 1, 'media', true, 0, NULL, NULL, NULL),
('c1000001-0001-0001-0001-000000000016', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b1000001-0001-0001-0001-000000000008', 
 'Existe algum prazo ou deadline crítico?', 
 'Identificar urgências externas',
 'text', 1, 'media', false, 1, NULL, NULL, NULL);