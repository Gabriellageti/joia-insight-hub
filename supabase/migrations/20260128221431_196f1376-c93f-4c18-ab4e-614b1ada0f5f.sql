-- Template Onboarding JoIA
INSERT INTO diagnostic_templates (id, name, description)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Onboarding JoIA',
  '{"phase": "onboarding", "objective": "Criar contexto, alinhar expectativas e preparar o terreno para os diagnósticos por área", "estimatedTimeMinutes": 25, "tags": ["onboarding", "kickoff", "contexto"], "status": "published", "version": "1.0"}'::jsonb
);

-- Bloco 1: Contexto do negócio
INSERT INTO template_sections (id, template_id, title, description, position, weight)
VALUES ('11111111-1111-1111-1111-111111111001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Contexto do negócio', 'Entender o terreno', 0, 1);

INSERT INTO template_questions (id, template_id, section_id, title, type, position, required, weight, criticality, helper_text, options) VALUES
('11111111-1111-1111-1111-111111110001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111001', 'Como você descreve hoje o momento da empresa em uma frase?', 'text', 0, true, 1, 'alta', NULL, NULL),
('11111111-1111-1111-1111-111111110002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111001', 'Qual é a principal fonte de faturamento hoje?', 'multiple_choice', 1, true, 1, 'alta', NULL, '["Produtos", "Serviços", "Contratos", "Recorrência", "Outros"]'::jsonb),
('11111111-1111-1111-1111-111111110003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111001', 'Qual é o maior desafio que a empresa enfrenta neste momento?', 'text', 2, true, 2, 'critica', 'Essa resposta vira referência para todo o projeto', NULL),
('11111111-1111-1111-1111-111111110004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111001', 'Se nada mudar, onde você acredita que a empresa estará daqui a 6 meses?', 'text', 3, true, 1, 'media', NULL, NULL);

-- Bloco 2: Dor principal e urgência
INSERT INTO template_sections (id, template_id, title, description, position, weight)
VALUES ('11111111-1111-1111-1111-111111111002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dor principal e urgência', 'Onde dói agora', 1, 1.5);

INSERT INTO template_questions (id, template_id, section_id, title, type, position, required, weight, criticality, helper_text, options, min_value, max_value) VALUES
('11111111-1111-1111-1111-111111110005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111002', 'O que mais te incomoda hoje na operação do dia a dia?', 'text', 0, true, 1.5, 'critica', NULL, NULL, NULL, NULL),
('11111111-1111-1111-1111-111111110006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111002', 'Essa dor está mais ligada a qual área?', 'multiple_choice', 1, true, 1, 'alta', NULL, '["Compras", "Financeiro", "Estoque", "Vendas", "Operações", "Pessoas", "Não sei"]'::jsonb, NULL, NULL),
('11111111-1111-1111-1111-111111110007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111002', 'Em uma escala de 1 a 5, o quão urgente é resolver isso?', 'scale', 2, true, 1.5, 'alta', NULL, NULL, 1, 5),
('11111111-1111-1111-1111-111111110008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111002', 'O que já foi tentado para resolver esse problema? Funcionou?', 'text', 3, false, 1, 'media', NULL, NULL, NULL, NULL);

-- Bloco 3: Dinheiro e impacto
INSERT INTO template_sections (id, template_id, title, description, position, weight)
VALUES ('11111111-1111-1111-1111-111111111003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dinheiro e impacto', 'Sem entrar em números ainda', 2, 1.5);

INSERT INTO template_questions (id, template_id, section_id, title, type, position, required, weight, criticality, helper_text, options) VALUES
('11111111-1111-1111-1111-111111110009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111003', 'Onde você sente que existe "dinheiro escorrendo" hoje?', 'text', 0, true, 2, 'critica', 'Exemplos: compra cara, estoque parado, perda, retrabalho, atraso, margem', NULL),
('11111111-1111-1111-1111-111111110010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111003', 'Se esse problema fosse resolvido, o que mudaria primeiro no negócio?', 'text', 1, true, 1, 'alta', NULL, NULL),
('11111111-1111-1111-1111-111111110011', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111003', 'Hoje, você sente mais dor em qual ponto?', 'multiple_choice', 2, true, 1.5, 'alta', NULL, '["Falta de caixa", "Falta de controle", "Falta de tempo", "Falta de clareza"]'::jsonb);

-- Bloco 4: Maturidade de gestão
INSERT INTO template_sections (id, template_id, title, description, position, weight)
VALUES ('11111111-1111-1111-1111-111111111004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Maturidade de gestão', 'Nível de organização', 3, 1);

INSERT INTO template_questions (id, template_id, section_id, title, type, position, required, weight, criticality, helper_text, options) VALUES
('11111111-1111-1111-1111-111111110012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111004', 'Existem rotinas definidas para acompanhar o negócio (reuniões, relatórios)?', 'yes_no', 0, true, 1, 'media', NULL, NULL),
('11111111-1111-1111-1111-111111110013', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111004', 'Você confia nos números que vê hoje?', 'multiple_choice', 1, true, 1.5, 'alta', NULL, '["Confio", "Confio mais ou menos", "Não confio", "Não vejo números"]'::jsonb),
('11111111-1111-1111-1111-111111110014', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111004', 'Se você se afastar por 15 dias, a empresa roda bem sem você?', 'yes_no', 2, true, 2, 'critica', 'Essa pergunta é ouro', NULL);

-- Bloco 5: Pessoas e decisão
INSERT INTO template_sections (id, template_id, title, description, position, weight)
VALUES ('11111111-1111-1111-1111-111111111005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Pessoas e decisão', 'Quem manda, quem executa', 4, 1);

INSERT INTO template_questions (id, template_id, section_id, title, type, position, required, weight, criticality, min_value, max_value) VALUES
('11111111-1111-1111-1111-111111110015', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111005', 'Quem toma as decisões finais hoje?', 'text', 0, true, 1, 'media', NULL, NULL),
('11111111-1111-1111-1111-111111110016', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111005', 'Quem executa as decisões no dia a dia?', 'text', 1, true, 1, 'media', NULL, NULL),
('11111111-1111-1111-1111-111111110017', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111005', 'Em uma escala de 1 a 5, o quanto o time está aberto a mudar processo?', 'scale', 2, true, 1.5, 'alta', 1, 5);

-- Bloco 6: Expectativa e alinhamento
INSERT INTO template_sections (id, template_id, title, description, position, weight)
VALUES ('11111111-1111-1111-1111-111111111006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Expectativa e alinhamento', 'Anticorpos contra frustração', 5, 1.5);

INSERT INTO template_questions (id, template_id, section_id, title, type, position, required, weight, criticality, helper_text) VALUES
('11111111-1111-1111-1111-111111110018', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111006', 'O que você espera que esse trabalho resolva primeiro?', 'text', 0, true, 1.5, 'critica', NULL),
('11111111-1111-1111-1111-111111110019', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111006', 'O que seria um sinal claro de sucesso para você nos primeiros 90 dias?', 'text', 1, true, 1, 'alta', NULL),
('11111111-1111-1111-1111-111111110020', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111006', 'Existe algo que, se não for respeitado, inviabiliza o projeto?', 'text', 2, false, 1, 'alta', 'Exemplos: horário, pessoas, cultura, caixa, tempo');

-- Bloco 7: Encaminhamento
INSERT INTO template_sections (id, template_id, title, description, position, weight)
VALUES ('11111111-1111-1111-1111-111111111007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Encaminhamento', 'Ligação com o framework', 6, 1);

INSERT INTO template_questions (id, template_id, section_id, title, type, position, required, weight, criticality, options) VALUES
('11111111-1111-1111-1111-111111110021', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111007', 'Qual área você acredita que deve ser atacada primeiro?', 'multiple_choice', 0, true, 1, 'alta', '["Compras", "Financeiro", "Estoque", "Operações", "Ainda não sei"]'::jsonb),
('11111111-1111-1111-1111-111111110022', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111007', 'Você consegue disponibilizar dados básicos para começarmos o diagnóstico?', 'yes_no', 1, true, 1, 'media', NULL),
('11111111-1111-1111-1111-111111110023', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111007', 'Quem será o ponto focal do projeto no dia a dia?', 'text', 2, true, 1, 'alta', NULL);