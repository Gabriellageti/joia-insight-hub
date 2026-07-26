-- Cadastro inicial a partir do status semanal da JoIA (27/07 a 02/08/2026).
-- Pode ser executada mais de uma vez: clientes, contatos, projetos e tarefas não são duplicados.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS trade_name text,
  ADD COLUMN IF NOT EXISTS state_registration text,
  ADD COLUMN IF NOT EXISTS address text;

WITH workspace_context AS (
  SELECT workspace_id FROM public.workspace_members WHERE workspace_id IS NOT NULL LIMIT 1
), client_seed (name, trade_name, cnpj, state_registration, segment, contact_name, contact_phone, status, address) AS (
  VALUES
    ('Granel Piscinas Industria e Comercio LTDA', 'Granel Piscinas', NULL, NULL, 'Piscinas', NULL, NULL, 'ativo', NULL),
    ('Trevo', 'Trevo', NULL, NULL, 'Desenvolvimento de aplicativos e marketing', 'Ana Luíza', '5532988913858', 'ativo', NULL),
    ('Master Distribuidora e Logistica LTDA', 'Master Distribuidora', '28204379000170', '003005957.00-32', 'Comércio atacadista de chocolates, confeitos, balas, bombons e semelhantes', 'Felipe', '5532984011814', 'ativo', 'Rua Wanderlei Quirino, 154, Bairro Popular, Cataguases - MG, CEP 36774-561'),
    ('Francisco Monteiro', 'Francisco Monteiro', NULL, NULL, 'Finanças pessoais', 'Francisco Monteiro', '5532991234575', 'ativo', 'Av. João Inácio Peixoto, 213 - Granjaria, Cataguases - MG, CEP 36773-560'),
    ('Tecidos C & S de Cataguases Ltda', 'C & S', '07622150000186', NULL, 'Comércio de tecidos', 'Nilton Carrara', '5532984978000', 'ativo', 'Praça Rui Barbosa, 168 - Centro, Cataguases - MG, CEP 36770-034'),
    ('Agua 2 O Distribuidora de Bebidas LTDA', 'Distribuidora de Bebidas H2O', '50787021000177', '004623424.00-54', 'Distribuição de bebidas', 'Francisco Monteiro', '5532991234575', 'ativo', 'Av. João Inácio Peixoto, 213 - Granjaria, Cataguases - MG, CEP 36773-560')
)
INSERT INTO public.clients (workspace_id, name, trade_name, cnpj, state_registration, segment, contact_name, contact_phone, status, address)
SELECT workspace.workspace_id, name, trade_name, cnpj, state_registration, segment, contact_name, contact_phone, status, address
FROM client_seed seed
CROSS JOIN workspace_context workspace
WHERE NOT EXISTS (
  SELECT 1 FROM public.clients client
  WHERE lower(client.name) = lower(seed.name)
     OR (seed.cnpj IS NOT NULL AND regexp_replace(COALESCE(client.cnpj, ''), '[^0-9]', '', 'g') = seed.cnpj)
);

WITH contact_seed (client_name, name, role, phone, is_primary) AS (
  VALUES
    ('Trevo', 'Ana Luíza', 'Contato principal', '5532988913858', true),
    ('Master Distribuidora e Logistica LTDA', 'Felipe', 'Diretor e contato principal', '5532984011814', true),
    ('Tecidos C & S de Cataguases Ltda', 'Nilton Carrara', 'Contato principal', '5532984978000', true),
    ('Agua 2 O Distribuidora de Bebidas LTDA', 'Francisco Monteiro', 'Contato principal', '5532991234575', true)
)
INSERT INTO public.client_contacts (workspace_id, client_id, name, role, phone, is_primary)
SELECT client.workspace_id, client.id, seed.name, seed.role, seed.phone, seed.is_primary
FROM contact_seed seed
JOIN public.clients client ON lower(client.name) = lower(seed.client_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_contacts contact
  WHERE contact.client_id = client.id AND lower(contact.name) = lower(seed.name)
);

WITH workspace_context AS (
  SELECT workspace_id FROM public.workspace_members WHERE workspace_id IS NOT NULL LIMIT 1
), project_seed (name, client_name, objective, scope, phase, project_type, progress, status, responsible, end_date, money_hypothesis) AS (
  VALUES
    ('Site Granel Piscinas', 'Granel Piscinas Industria e Comercio LTDA', 'Entregar o site institucional da Granel Piscinas.', 'Construção e entrega do site institucional.', 'Concluído', 'website', 100, 'Concluído', 'Gabriel e Gustavo', NULL::date, 1600::numeric),
    ('Aplicativo Trevo', 'Trevo', 'Concluir a implantação do aplicativo da Trevo.', 'Aplicativo, carga inicial de dados e integração com Telegram e IA.', 'Implantação', 'systems', 85, 'Aguardando cliente', 'Gabriel e Gustavo', NULL::date, 0::numeric),
    ('Identidade visual JoIA', NULL, 'Construir a identidade visual e os materiais de marketing da JoIA.', 'Questionário de posicionamento, identidade visual e comunicação; fornecedor: Trevo.', 'Planejamento', 'other', 10, 'Aguardando JoIA', 'Gabriel', NULL::date, 0::numeric),
    ('Master Flow', 'Master Distribuidora e Logistica LTDA', 'Apoiar a operação de atacado da Master Distribuidora.', 'Sistema de atacado, regras de negócio e melhorias solicitadas.', 'Desenvolvimento', 'systems', 70, 'Em andamento', 'Gabriel e Djalma', DATE '2026-08-15', 0::numeric),
    ('Master Rotas', 'Master Distribuidora e Logistica LTDA', 'Apoiar a logística do varejo e o acompanhamento de rotas.', 'Operação assistida, validação e precificação do aplicativo de rotas.', 'Operação assistida', 'systems', 95, 'Em validação', 'Gabriel e Djalma', NULL::date, 0::numeric),
    ('App Finanças Monteiro', 'Francisco Monteiro', 'Permitir o controle financeiro pessoal com lançamentos por voz.', 'Aplicativo de finanças pessoais e integração de transcrição com IA.', 'Finalização', 'ai', 92, 'Em andamento', 'Gabriel e Gustavo', DATE '2026-07-31', 0::numeric),
    ('Prumo', NULL, 'Evoluir o produto JoIA de controle e gestão para vendedores de atacado.', 'Produto interno em uso por Matheus e João, com melhorias contínuas.', 'Evolução contínua', 'systems', 60, 'Em andamento', 'Gabriel, Gustavo e João', NULL::date, 0::numeric),
    ('JoIA Soluções — Hub interno', NULL, 'Centralizar a gestão interna da JoIA.', 'Projetos, tarefas, diagnósticos, templates, financeiro, equipe e permissões.', 'Refinamento', 'systems', 80, 'Em andamento', 'Gabriel', DATE '2026-07-31', 0::numeric),
    ('Estrutura institucional JoIA', NULL, 'Preparar a presença institucional da JoIA.', 'Identidade visual, site institucional, landing page e redes sociais.', 'Em espera', 'other', 5, 'Em espera', 'Gabriel e Matheus', NULL::date, 0::numeric),
    ('Consultoria C&S Tecidos', 'Tecidos C & S de Cataguases Ltda', 'Iniciar a consultoria após o aceite comercial.', 'Plano de ação, cronograma, diagnóstico e levantamento inicial.', 'Proposta apresentada', 'consulting', 15, 'Aguardando decisão', 'Gabriel e Matheus', NULL::date, 0::numeric),
    ('Grupo H2O', 'Agua 2 O Distribuidora de Bebidas LTDA', 'Organizar e acompanhar as demandas técnicas, operacionais e financeiras.', 'Resumo executivo, Alterdata, nota fiscal, pagamentos e próximos passos.', 'Em andamento', 'consulting', 50, 'Em andamento', 'Gabriel e Matheus', NULL::date, 0::numeric)
)
INSERT INTO public.projects (workspace_id, name, client_id, objective, scope, phase, project_type, progress, status, responsible, end_date, money_hypothesis)
SELECT workspace.workspace_id, seed.name, client.id, seed.objective, seed.scope, seed.phase, seed.project_type, seed.progress, seed.status, seed.responsible, seed.end_date, seed.money_hypothesis
FROM project_seed seed
LEFT JOIN public.clients client ON lower(client.name) = lower(seed.client_name)
CROSS JOIN workspace_context workspace
WHERE NOT EXISTS (SELECT 1 FROM public.projects project WHERE lower(project.name) = lower(seed.name));

WITH task_seed (project_name, title, description, responsible, priority, status, due_date, completed_at) AS (
  VALUES
    ('Site Granel Piscinas', 'Confirmar custo do domínio', 'Custo identificado: R$ 65,00.', 'Gabriel', 'medium', 'next', NULL::date, NULL::timestamptz),
    ('Site Granel Piscinas', 'Registrar resultado financeiro final', 'Receita de R$ 1.600,00; repasse de R$ 200,00 ao Gustavo; domínio de R$ 65,00.', 'Gabriel', 'medium', 'next', NULL::date, NULL::timestamptz),
    ('Site Granel Piscinas', 'Encerrar formalmente o projeto', 'Registrar o encerramento no controle interno da JoIA.', 'Gabriel', 'low', 'next', NULL::date, NULL::timestamptz),
    ('Aplicativo Trevo', 'Receber dados para cadastro no banco', 'Aguardar as informações solicitadas à Trevo.', 'Gabriel', 'high', 'waiting', NULL::date, NULL::timestamptz),
    ('Aplicativo Trevo', 'Obter Chat IDs e configurar Telegram', 'Concluir a configuração da integração com as colaboradoras.', 'Gustavo', 'medium', 'waiting', NULL::date, NULL::timestamptz),
    ('Aplicativo Trevo', 'Criar conta OpenAI e adicionar créditos', 'Preparar os recursos de IA necessários ao aplicativo.', 'Gabriel', 'medium', 'next', NULL::date, NULL::timestamptz),
    ('Identidade visual JoIA', 'Responder questionário de posicionamento', 'Enviar à Trevo as respostas sobre marca, diferenciais, público e comunicação.', 'Gabriel', 'high', 'next', NULL::date, NULL::timestamptz),
    ('Master Flow', 'Implementar melhorias solicitadas', 'Continuar o refinamento das regras de negócio e melhorias aprovadas pelo Felipe.', 'Djalma', 'high', 'in_progress', DATE '2026-08-15', NULL::timestamptz),
    ('Master Flow', 'Acompanhar evolução do desenvolvimento', 'Acompanhar diariamente o avanço e os pontos de decisão do Master Flow.', 'Gabriel', 'medium', 'in_progress', DATE '2026-08-15', NULL::timestamptz),
    ('Master Rotas', 'Iniciar operação assistida', 'Acompanhar Felipe e a equipe no uso inicial do aplicativo.', 'Gabriel', 'high', 'next', DATE '2026-07-27', NULL::timestamptz),
    ('Master Rotas', 'Definir precificação do Master Rotas', 'Conversar com Matheus e preparar a cobrança após o aceite operacional.', 'Matheus', 'high', 'next', NULL::date, NULL::timestamptz),
    ('App Finanças Monteiro', 'Integrar transcrição de áudio com IA', 'Criar conta, adicionar créditos e integrar transcrição, interpretação e lançamentos financeiros por voz.', 'Gustavo', 'high', 'in_progress', DATE '2026-07-31', NULL::timestamptz),
    ('App Finanças Monteiro', 'Realizar testes finais e entregar versão funcional', 'Validar os fluxos de receita e despesa por voz antes da entrega.', 'Gabriel', 'high', 'next', DATE '2026-07-31', NULL::timestamptz),
    ('Prumo', 'Levantar funcionalidades ainda não utilizadas', 'Mapear barreiras de adoção com Matheus e João.', 'João', 'medium', 'next', NULL::date, NULL::timestamptz),
    ('Prumo', 'Priorizar backlog de melhorias comerciais', 'Organizar e priorizar as melhorias de maior impacto comercial.', 'Gabriel e Gustavo', 'medium', 'next', NULL::date, NULL::timestamptz),
    ('JoIA Soluções — Hub interno', 'Finalizar ajustes restantes do hub interno', 'Concluir os ajustes de plano de ação, diagnóstico, templates e financeiro.', 'Gabriel', 'high', 'in_progress', DATE '2026-07-31', NULL::timestamptz),
    ('JoIA Soluções — Hub interno', 'Criar perfis e permissões da equipe', 'Preparar os acessos para Gabriel, Matheus, Gustavo, Djalma e João.', 'Gabriel', 'high', 'next', DATE '2026-07-31', NULL::timestamptz),
    ('Estrutura institucional JoIA', 'Definir momento de retomada institucional', 'Site, landing page e redes sociais permanecem em espera até a prioridade mudar.', 'Gabriel', 'low', 'backlog', NULL::date, NULL::timestamptz),
    ('Consultoria C&S Tecidos', 'Realizar follow-up comercial', 'Confirmar a decisão sobre a proposta de consultoria.', 'Gabriel', 'high', 'waiting', NULL::date, NULL::timestamptz),
    ('Consultoria C&S Tecidos', 'Preparar início da consultoria após aceite', 'Organizar cronograma, plano de ação, diagnóstico e levantamento inicial.', 'Gabriel e Matheus', 'medium', 'backlog', NULL::date, NULL::timestamptz),
    ('Grupo H2O', 'Preparar resumo executivo das demandas', 'Consolidar as demandas técnicas e operacionais levantadas.', 'Gabriel', 'high', 'in_progress', NULL::date, NULL::timestamptz),
    ('Grupo H2O', 'Alinhar valores relacionados à Alterdata', 'Alinhar com Helaine os valores pendentes.', 'Matheus', 'high', 'next', NULL::date, NULL::timestamptz),
    ('Grupo H2O', 'Emitir nota fiscal e acompanhar pagamentos', 'Registrar os pagamentos em aberto e acompanhar a regularização.', 'Gabriel', 'high', 'next', NULL::date, NULL::timestamptz)
)
INSERT INTO public.tasks (project_id, client_id, title, description, responsible, priority, status, task_type, due_date, completed_at)
SELECT project.id, project.client_id, seed.title, seed.description, seed.responsible, seed.priority, seed.status, 'project', seed.due_date, seed.completed_at
FROM task_seed seed
JOIN public.projects project ON lower(project.name) = lower(seed.project_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks task
  WHERE task.project_id = project.id AND lower(task.title) = lower(seed.title)
);

INSERT INTO public.tasks (title, description, responsible, priority, status, task_type)
SELECT 'Confirmar identificação do Mercado Dona Euzébia', 'Cobrar Chicão sobre a reunião, identificar o supermercado e confirmar o interesse antes de criar cliente e projeto.', 'Gabriel', 'medium', 'next', 'personal'
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks WHERE lower(title) = lower('Confirmar identificação do Mercado Dona Euzébia') AND task_type = 'personal'
);
