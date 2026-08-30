# P11 — Matriz de ataques de segurança

Data: 29/08/2026

Projeto Supabase: `uopxixfgaaxsgqgrfpvx`

Artefato reproduzível: `supabase/tests/p11_security_attack_matrix.sql`

## Método

A matriz cria dois workspaces e identidades sintéticas dentro de uma única transação, assume o papel PostgreSQL `authenticated`, injeta claims equivalentes aos usuários de teste e executa ataques diretos no banco. O script encerra deliberadamente com `SQLSTATE P1100` contendo o resultado sanitizado; isso reverte toda a transação e impede persistência dos fixtures.

Execução final: **29 PASS, 0 FAIL, rollback confirmado**. Os IDs sintéticos e dados corporativos não são registrados neste relatório.

## Resultados executados

| Teste | Usuário | Ação | Resultado esperado | Resultado real | Status | Evidência | Correção |
|---|---|---|---|---|---|---|---|
| CLIENT-SELECT-CROSS | Admin A | SELECT cliente B | 0 linhas | 0 linhas | PASS | RLS query count | Nenhuma |
| CLIENT-INSERT-CROSS | Admin A | INSERT no workspace B | Negado | SQLSTATE 42501 | PASS | `WITH CHECK` | Nenhuma |
| CLIENT-UPDATE-CROSS | Admin A | UPDATE cliente B | 0 linhas | 0 linhas | PASS | RLS update count | Nenhuma |
| CLIENT-DELETE-CROSS | Admin A | DELETE cliente B | 0 linhas | 0 linhas | PASS | RLS delete count | Nenhuma |
| CLIENT-WORKSPACE-REASSIGN | Admin A | Alterar `workspace_id` | Negado | SQLSTATE 42501 | PASS | Trigger/RLS | Nenhuma |
| CLIENT-OWNER-B-READ | Admin B | Controle positivo no próprio workspace | 1 linha | 1 linha | PASS | RLS query count | Nenhuma |
| PROJECT-SELECT-CROSS | Admin A | SELECT projeto B | 0 linhas | 0 linhas | PASS | RLS query count | Nenhuma |
| PROJECT-INSERT-CROSS | Admin A | INSERT projeto B | Negado | SQLSTATE 42501 | PASS | `WITH CHECK` | Nenhuma |
| PROJECT-UPDATE-CROSS | Admin A | UPDATE projeto B | 0 linhas | 0 linhas | PASS | RLS update count | Nenhuma |
| PROJECT-DELETE-CROSS | Admin A | DELETE projeto B | 0 linhas | 0 linhas | PASS | RLS delete count | Nenhuma |
| TASK-SELECT-CROSS | Admin A | SELECT tarefa B | 0 linhas | 0 linhas | PASS | RLS query count | Nenhuma |
| TASK-UPDATE-CROSS | Admin A | UPDATE tarefa B | 0 linhas | 0 linhas | PASS | RLS update count | Nenhuma |
| TASK-DELETE-CROSS | Admin A | DELETE tarefa B | 0 linhas | 0 linhas | PASS | RLS delete count | Nenhuma |
| TASK-CLIENT-CROSS | Admin A | Usar `client_id` do workspace B | Negado | SQLSTATE 42501 | PASS | Trigger de integridade | Nenhuma |
| TASK-ASSIGNEE-CROSS | Admin A | Usar `assignee_id` do workspace B | Negado | SQLSTATE 42501 | PASS | Trigger de autorização | Nenhuma |
| MEETING-SELECT-CROSS | Admin A | SELECT reunião B | 0 linhas | 0 linhas | PASS | RLS query count | Nenhuma |
| DOCUMENT-SELECT-CROSS | Admin A | SELECT metadado B | 0 linhas | 0 linhas | PASS | RLS query count | Nenhuma |
| STORAGE-SELECT-CROSS | Admin A | SELECT path conhecido B | 0 linhas | 0 linhas | PASS | `storage.objects` RLS | Policies corrigidas em P11 |
| REPORT-SELECT-CROSS | Admin A | SELECT relatório B | 0 linhas | 0 linhas | PASS | RLS query count | Nenhuma |
| REPORT-FINAL-UPDATE | Admin A | UPDATE relatório finalizado | Negado | SQLSTATE 42501 | PASS | Constraint/trigger | Nenhuma |
| REPORT-FINAL-DELETE | Admin A | DELETE relatório finalizado | 0 linhas | 0 linhas | PASS | RLS delete count | Nenhuma |
| CRM-SELECT-CROSS | Admin A | SELECT lead B | 0 linhas | 0 linhas | PASS | RLS query count | Policies corrigidas em P11 |
| AUTOMATION-MEMBER-INSERT | Membro A | Criar regra | Negado | SQLSTATE 42501 | PASS | RLS/trigger | Nenhuma |
| AUTOMATION-MEMBER-UPDATE | Membro A | Alterar regra | 0 linhas | 0 linhas | PASS | RLS update count | Nenhuma |
| AUTOMATION-MEMBER-RUN | Membro A | Executar runner manual | Negado | SQLSTATE 42501 | PASS | RPC exige Gestor | Boundary corrigida em P11 |
| AI-CONTEXT-CROSS | Admin A | Contexto de cliente B | Negado | SQLSTATE 42501 | PASS | RPC `get_ai_context` | Nenhuma |
| AI-MEETING-CROSS | Admin A | Contexto de reunião B | Negado | SQLSTATE 42501 | PASS | RPC `get_ai_context` | Nenhuma |
| AI-REPORT-CROSS | Admin A | Contexto de relatório B | Negado | SQLSTATE 42501 | PASS | RPC `get_ai_context` | Nenhuma |
| DOCUMENT/CRM POLICY COMPILATION | Catálogo | Inspecionar expressão final | Correlação explícita | Correlação explícita | PASS | `pg_policies` | Recriação com aliases qualificados |

## Testes relacionados aprovados fora da matriz

- Todas as 66 tabelas públicas reais estão com RLS habilitada.
- As 49 funções `SECURITY DEFINER` reais não concedem execução a `PUBLIC` nem `anon`.
- O runner manual é executável por `authenticated`, mas valida acesso Gestor ou superior internamente.
- Dez execuções do runner no mesmo lote mantiveram `automation_runs` em 12 registros e zero falhas: nenhum efeito duplicado.
- O cron executou sem navegador às 17:00, 17:05 e 17:10 UTC, todas com status `succeeded`; health `automation-scheduler=healthy`.
- O E2E PWA comprovou ausência de `/api`, `/rest/v1` e `/auth/v1` no Cache Storage e falha de rede offline para uma API privada.

## Bloqueado — não validado

| Teste | Motivo | O que é necessário | Como validar depois |
|---|---|---|---|
| Signed URL e versão antiga por HTTP | Sem deployment/usuários E2E reais acessíveis | Deployment final e usuários isolados A/B | Solicitar URL como A, tentar obter/usar como B e após expiração |
| Ataques REST/RPC no domínio final | Projeto Vercel não acessível | Acesso ao projeto oficial e credenciais E2E | Repetir matriz via `supabase-js`/HTTP, sem chave administrativa |
| Prompt injection e exfiltração no modelo real | AI Gateway/OIDC de produção não verificável | Deployment e variáveis de produção | Inserir texto hostil sintético e validar resposta do modelo |
| Logout A → login B real e multiaba | Ausência de usuários de teste reais | Admin, Gestor, Membro e Viewer em ambiente E2E | Executar Playwright autenticado em duas abas e modo offline |
| CRM dupla conversão e templates concorrentes via API real | Sem contas E2E/deployment | Fixtures isolados e deployment final | Enviar requisições paralelas, validar uma única entidade |

Esses itens não recebem PASS por inferência. A matriz SQL comprova a camada de banco; não substitui o E2E autenticado no ambiente final.
