# P11 — Contenção financeira e preservação de auditoria

Data: 30/08/2026. Projeto: `uopxixfgaaxsgqgrfpvx`. Autorização: decisões humanas do P11, itens 1, 5 e 6.

## Contenção financeira — PASS

Migration nova: `20260830164626_p11_restore_financial_recurring_server_boundary.sql`.

- Remove `financial_recurring_rules_finance_select`.
- Revoga privilégios de tabela e de coluna de PUBLIC, anon e authenticated.
- Mantém RLS e os privilégios existentes de service_role; não concede novos privilégios.
- Não contém INSERT/UPDATE/DELETE de dados financeiros. Nenhuma recorrência ou cobrança real foi consultada no smoke ou alterada.
- Inclui timeout de lock/statement, transação e verificações fail-closed.

Aplicação seletiva pelo CLI autenticado, seguida de registro **somente desta versão** no histórico. Não houve `db push`, replay do histórico ou repair de versões antigas.

| Verificação pós-migration | Resultado |
|---|---|
| pg_policies | PASS — apenas `financial_recurring_rules_admin_all`; policy ampla ausente |
| authenticated SELECT tabela | PASS — false |
| authenticated SELECT qualquer coluna | PASS — false |
| anon SELECT | PASS — false |
| service_role SELECT | PASS — true |
| REST Admin/Gestor/Membro/Viewer | PASS — quatro identidades sintéticas, HTTP 403 / SQLSTATE 42501 |
| REST anon | PASS — HTTP 401 / SQLSTATE 42501 |
| REST server-side | PASS — service_role HTTP 200, filtro por UUID inexistente, sem ler registros empresariais |
| Cleanup do teste financeiro | PASS — quatro usuários/workspaces removidos e ausência verificada |

Run: `p11-e2e-financial-65e96a86-37d2-4a22-a46c-5a1b8cf47f4e`, início `2026-08-30T16:49:28.697Z`.
Reprodução: `scripts/p11-financial-boundary-smoke.mjs`, com credenciais injetadas apenas no processo servidor. O cliente atacante usa chave pública + JWT próprio, nunca a chave administrativa.

**Limite da evidência:** o caminho server-side comprovado é a leitura técnica pelo SDK privilegiado, não uma nova funcionalidade de recorrências no aplicativo. Não foi criado endpoint financeiro substituto. A consulta frontend dessa tabela fica indisponível por decisão humana até existir modelagem explícita de tenant. Não reabrir durante P11.

## Histórico de exclusão — PASS no escopo activity_logs

Migration: `20260830164910_p11_preserve_activity_history_on_delete.sql`.

A estratégia separa referência de navegação e identidade histórica:

- FKs de activity_logs para workspace/cliente/projeto/reunião passam de CASCADE para SET NULL; task e actor já usavam SET NULL.
- workspace_id fica nullable. A policy de leitura por workspace **não muda**: eventos sem workspace ativo não ficam visíveis a usuários de outros workspaces; são consultáveis apenas por backend autorizado.
- Trigger BEFORE INSERT/UPDATE preserva os IDs originais em `metadata.references`, inclusive em eventos antigos atingidos por SET NULL. Não há backfill em massa nem purge.
- Logs operacionais mantêm `entity_id`, título e `entity_snapshot` com campos mínimos de contexto; não copiam secrets nem o ambiente do processo.
- Referências a entidades já removidas são anuladas no campo FK, após serem preservadas em metadata.
- Exclusão de reunião captura o pai antes da cascata; eventos dos itens filhos recuperam esse contexto. Se não houver snapshot, falha explicitamente.
- Workspaces sintéticos com slug `p11-e2e-*` recebem `environment=e2e` e `test_run_id` nos eventos. A marcação não concede privilégios e não habilita expurgo.
- Escrita/DELETE/TRUNCATE de auditoria continuam proibidos para o navegador. Nenhuma trigger ou constraint foi desativada.
- Tipos TypeScript refletem a nulabilidade; frontend existente continua filtrando workspace ativo.

## Ensaios

| Ensaio | Evidência | Resultado |
|---|---|---|
| Pré-aplicação transacional | `p11-e2e-audit-db62828d-94f7-45ab-ba3e-9f1929580162` | PASS — 13 eventos preservados durante cleanup; schema/fixtures revertidos ao final |
| Pós-aplicação transacional | `p11-e2e-audit-a8f6b10e-3a79-4565-98dc-1e5912d6f9d9` | PASS — mesma matriz |
| DELETE de tarefa autenticado + snapshot | Run real abaixo | PASS |
| DELETE de reunião com pauta/decisão/próximo passo | Run real abaixo | PASS |
| Outro workspace lê IDs conhecidos de auditoria | Run real abaixo | PASS — zero linhas |
| UPDATE/DELETE de auditoria pelo navegador | Run real abaixo | PASS — 42501 |
| Cleanup físico dos IDs operacionais conhecidos | Run real abaixo | PASS — registros e usuários ausentes |
| Histórico depois de excluir workspace/usuário | Run real abaixo | PASS — 13 eventos anteriores + 2 eventos de exclusão = 15 retidos |

Run real: `p11-e2e-cleanup-563a57e1-53d4-4c17-99b8-515a5665d350`, início `2026-08-30T16:59:04.199Z`.

IDs sintéticos de referência:

- Workspace A: `e63fb150-24a1-410c-89c7-117c5a55009a`.
- Workspace B: `c3f9adcf-79dd-494e-b1b3-289cfaa976fd`.
- Tarefa: `d4575856-8ec1-4aa3-9dab-4c68ac2adac6`.
- Reunião: `d1042807-30b7-4945-8195-a80cae4fffe0`.

Houve dois ensaios preparatórios do harness que falharam antes da matriz completa: coluna de membership escrita como `role` em vez de `access_level`; depois, tarefa sintética sem assignee obrigatório pela RLS. O harness foi corrigido para respeitar o schema real; nenhuma policy foi relaxada. Seus cleanups passaram e **4 + 6 eventos** permaneceram retidos, não apagados. A primeira versão SQL também teve um parêntese excedente, detectado e revertido no pré-teste transacional antes da aplicação.

Consulta final: **zero usuários/workspaces dos testes financeiros e cleanup restantes; 25 eventos activity_logs retidos** somando os três runs persistentes. Os testes transacionais revertem seus próprios eventos por desenho explícito e não contam como smoke persistente.

## Retenção e limites

Não existe expurgo automático E2E. Eventos retidos sem workspace são server-only; localização administrativa por test_run_id/references. Qualquer expurgo futuro exige política aprovada, prazo, escopo, responsável e evidência exportada com proteção adequada. Não reutilizar scripts antigos que apagam workspaces com owner único ou ignoram erros de cleanup.

Esta correção cobre **activity_logs**, não certifica retenção integral de todos os outros históricos do produto. Task history, histórico documental, auditoria comercial e de automações precisam de revisão no planejamento do smoke completo; suas cascatas não foram alteradas nesta migration. O gate de cleanup global continua condicionado à validação desses módulos. Não apagar seus registros de auditoria por conveniência.

## Reprodução e operação

```powershell
node scripts/p11-prepare-activity-probe.mjs
# Pré-aplicação, apenas quando a migration ainda não existir no alvo:
npx supabase db query --linked --file tmp/p11-activity-preflight.sql --output json
# Depois de aplicada:
npx supabase db query --linked --file scripts/p11-activity-probe.sql --output json
node --env-file=.env scripts/p11-activity-cleanup-smoke.mjs
```

Scripts REST exigem SUPABASE_SERVICE_ROLE_KEY somente no ambiente do processo servidor. Não colocá-la em `.env` rastreado, argumento de CLI, screenshot ou relatório.

Não reverter a contenção para restaurar a policy vulnerável. Se houver falha de auditoria, pausar as exclusões afetadas e realizar correção progressiva. Não voltar a CASCADE nem tornar workspace_id NOT NULL sem inventário dos eventos históricos detached. `/api/health` oficial retornou HTTP 200/healthy após as mudanças.
