# P5 — Templates e Processos Padronizados

Data de conclusão: 29/08/2026

## O que foi criado

- Área `Modelos de Projeto` para cadastrar estruturas reutilizáveis de etapas e tarefas.
- Modelos independentes de tarefa, reutilizáveis no diálogo de criação de tarefas.
- Modelo publicado `Consultoria Empresarial` com sete etapas e sete tarefas iniciais.
- Checklists persistidos na tabela operacional `tasks`.
- Regras de datas relativas para início e prazo (`dia 0`, `+3`, `+7`, `+15` e demais intervalos).
- Aplicação atômica e idempotente de modelos em projetos.
- Duplicação transacional de projeto com seleção de tarefas, etapas, documentos estruturais, responsáveis e configurações.
- Vínculos de documentos por referência, sem copiar arquivos físicos nem históricos.
- Registro da aplicação e snapshot do modelo usado no projeto.

## O que foi alterado

- O cadastro de projeto agora carrega modelos publicados e permite escolher a estrutura inicial.
- `addProject` passou a devolver o projeto criado e compensa a criação removendo o projeto caso a aplicação do modelo falhe.
- O cadastro de tarefas agora pode ser preenchido por um modelo independente.
- O mapeamento de tarefas passou a ler e persistir checklists reais em JSONB.
- A listagem de projetos ganhou a ação `Duplicar`.
- Os tipos TypeScript do Supabase foram sincronizados com o schema remoto e complementados para compatibilidade com campos já usados pelo aplicativo.

## Migrations

- `20260829050000_p5_project_process_templates.sql`: schema, RLS, índices, modelo inicial, aplicação e duplicação.
- `20260829051500_p5_template_editor_rpc.sql`: editor transacional de modelos de projeto.
- `20260829052000_p5_template_assignees.sql`: inclusão segura dos responsáveis na associação do projeto.
- `20260829052500_p5_template_auth_boundary.sql`: remoção da dependência de leitura direta de `auth.users` pelo papel autenticado.
- `20260829053000_p5_standalone_task_templates.sql`: modelos independentes de tarefa e estrutura final de sete etapas.

Todas foram aplicadas no projeto Supabase conectado e registradas no histórico remoto.

## Novas tabelas

- `project_templates`
- `project_template_stages`
- `task_templates`
- `task_template_checklist_items`
- `project_stages`
- `project_template_documents`
- `project_document_links`
- `project_template_instantiations`

As tabelas operacionais existentes `projects`, `tasks`, `project_members` e `documents` continuam sendo as fontes únicas de verdade.

## Componentes

- Página `ProjectTemplates`.
- Diálogo `DuplicateProjectDialog`.
- Evoluções em `ProjectDialog` e `TaskDialog`.
- Serviço `project-templates.ts` para consulta e execução das operações.

## Rotas

- Nova rota protegida `/modelos-projeto`.
- Novo item `Modelos de Projeto` no menu de apoio.
- Fluxos existentes `/projetos` e `/plano-acao` foram evoluídos sem criar rotas paralelas.

## Políticas RLS

- 16 políticas nas oito tabelas novas.
- Leitura exige associação operacional ao workspace ou ao projeto.
- Escrita de modelos exige nível de gestor ou superior.
- Etapas, documentos vinculados e aplicações respeitam a associação explícita ao projeto.
- Funções públicas usam `SECURITY INVOKER`; não contornam RLS.
- Grants explícitos para `authenticated` e revogação integral de `anon`.

## Testes realizados

- Lint e TypeScript sem erros.
- 107 testes unitários aprovados, incluindo seis verificações específicas do P5.
- 9 testes de componentes aprovados.
- Build de produção e verificação PWA aprovados.
- 9 testes E2E aprovados em execução sequencial; dois específicos do P5.
- Validação responsiva em 390 px e na matriz existente de 320, 375, 768, 1024 e 1440 px.
- Teste transacional real com usuário autenticado: aplicação do modelo, sete etapas, sete tarefas, checklist, prazo relativo, idempotência, modelo independente e duplicação; rollback confirmado.
- Modelo publicado em produção confirmado com sete etapas e sete tarefas.
- 16 políticas RLS confirmadas nas tabelas do P5.
- `supabase db lint` sem erros do P5.

## Problemas encontrados

- A primeira validação encontrou leitura indevida de `auth.users` dentro de uma função `SECURITY INVOKER`; a função foi corrigida para usar apenas `profiles` visível por RLS e retestada.
- Uma execução E2E paralela excedeu o timeout de carregamento de um chunk já existente; o teste isolado passou e a matriz completa sequencial terminou com 9/9 aprovações.
- O advisor via conector Supabase recusou a consulta por permissão da conexão. RLS, grants, índices, funções e lint foram validados diretamente no banco.
- O lint do banco mantém um aviso legado de variável sombreada em `create_financial_recurring_expense`, fora do escopo do P5.

## Dívidas técnicas restantes

- O editor atual cria modelos novos; edição versionada e arquivamento de modelos existentes podem ser adicionados quando houver necessidade operacional.
- Documentos estruturais já são vinculados sem duplicação física, mas a curadoria desses vínculos dentro do editor de modelo ainda não possui seletor visual.
- O histórico remoto mantém divergências anteriores ao P0; nenhuma migration legada foi alterada.

## Sugestões para próxima etapa

- Usar `project_template_instantiations` no P6 para evitar notificações duplicadas durante a geração inicial.
- Tratar tarefas geradas em lote como uma única origem de notificação, com resumo acionável em vez de sete alertas separados.
