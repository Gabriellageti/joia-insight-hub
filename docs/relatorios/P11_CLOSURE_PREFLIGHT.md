# P11 — Pré-validação do fechamento final

> Registro histórico da descoberta. As decisões humanas posteriores autorizaram a contenção e a correção da auditoria, agora aplicadas e testadas. Consulte [P11_FINAL_CLOSURE.md](P11_FINAL_CLOSURE.md) para o estado vigente; a decisão continua NO-GO por outros gates.

Data: 30/08/2026. Esta etapa está **interrompida para decisão humana**, não concluída.
Decisão: **NO-GO**. Nenhum P12, merge, deploy ou alteração de banco foi executado nesta etapa.

## Evidência atual

| Verificação | Estado | Evidência |
|---|---|---|
| GitHub fetch | PASS | `git fetch origin main`; branch `codex/p4-p10-platform`, HEAD `f3ca1488f9a030185ed410843a9fe325db9e474a` |
| Históricos preservados | PASS | `git rev-list --left-right --count origin/main...HEAD`: `11 11` |
| Conflitos textuais | PASS | `git merge-tree --write-tree HEAD origin/main`: exit 0; árvore `556825e0492b294412fb5ae060517b5d705b8a22`; nenhum merge de branch realizado |
| Integração semântica segura | FAIL | Uma migration da main reabre leitura financeira sem correlação com workspace/projeto |
| Equipe Vercel | PASS | API `/v2/teams/team_615LDFPn5KZPxznrZihairVa`: `joia-solucoes-projects`, plano `hobby`, billing `active` |
| OIDC e catálogo do modelo | PASS | Token de produção presente, API key própria ausente; `openai/gpt-5.6-luna` listado pelo Gateway |
| Créditos | PASS — consulta | Gateway: saldo `0`, consumo total `0`; isso não aprova geração |
| Geração real | BLOQUEADO — AÇÃO HUMANA NECESSÁRIA | 2026-08-30T16:07:42.827Z: HTTP 403 `GatewayInternalServerError`, exige cartão válido para atender solicitações |
| Supabase oficial | PASS — identificação | `uopxixfgaaxsgqgrfpvx`, JoiaLabs, organização `cmkljcraatrwqpmppxfe`, `ACTIVE_HEALTHY`, `sa-east-1` |
| PITR | FAIL — requisito de PITR ativo | `supabase backups list`: `pitr_enabled=false` |
| Backups recuperáveis | BLOQUEADO — NÃO VALIDADO | Resposta `backups:null`, `physical_backup_data:{}`, `walg_enabled:true`; não prova restore nem ausência de cópias internas do provedor |
| Plano/retencão/restore Supabase | BLOQUEADO — NÃO VALIDADO | Plano não exposto pelas consultas CLI realizadas; conector está em outra organização sem acesso ao projeto |
| RPO/RTO | BLOQUEADO — NÃO VALIDADO | Sem backup selecionável e ensaio de restore; nenhum SLA inventado |
| Smoke autenticado final | BLOQUEADO — NÃO VALIDADO | Pausado pelo achado financeiro e pelo caminho de cleanup/auditoria abaixo; não foram criadas fixtures nesta etapa |

## Achado crítico: leitura de recorrências financeiras

Arquivo da main: `supabase/migrations/20260829210000_reconcile_agua_2_o_legacy_cycles_and_recurring_permissions.sql`.

A policy `financial_recurring_rules_finance_select` aceita `admin_joia`, `financeiro_joia` OU a existência de uma membership owner/admin/manager do usuário. O EXISTS não compara o workspace/projeto da linha financeira. A tabela legada não tem coluna workspace_id no schema versionado.

A consulta ao catálogo de produção confirmou:

- a policy está ativa, junto de `financial_recurring_rules_admin_all`;
- `has_table_privilege('authenticated','public.financial_recurring_rules','SELECT') = true`;
- a condição de membership não está correlacionada com a linha;
- a listagem de migrations com versão >= `20260829160000` retornou apenas as seis migrations P11, terminando em `20260829165722`; a migration financeira acima não consta nessa listagem.

Conclusão: **FAIL de isolamento na configuração SQL**, com divergência entre catálogo e histórico. A policy permite leitura não segmentada para quem atende à condição. Não foi feita extração de dados empresariais, nem comprovado um incidente histórico de vazamento. O teste REST com identidades sintéticas permanece pendente.

Contenção proposta, aguardando autorização: restaurar o boundary server-only anteriormente definido em `20260828210719_close_project_membership_bypass.sql`, revogando acesso `authenticated` à tabela e removendo a policy de leitura ampla, através de migration rastreável. Impacto: leitura de recorrências no navegador fica indisponível. Nenhum registro financeiro deve ser alterado. A alternativa de reabrir acesso exige modelagem explícita de tenant e testes negativos; não deve ser improvisada.

## Cleanup e auditoria

O catálogo confirmou que `private.log_core_operational_activity()` é AFTER DELETE e tenta gravar o ID da entidade já removida em uma FK de activity_logs. Para tarefas, por exemplo, a FK task_id aponta para tasks. Isso é um defeito estrutural no caminho de exclusão; o erro de cleanup já havia sido observado no ensaio anterior. Nenhuma exclusão foi reexecutada nesta etapa.

As FKs de activity_logs para client, project, meeting e workspace usam CASCADE. Portanto, apagar fixtures por cascata também pode apagar auditoria. Não foi encontrada uma política de retenção aprovada nos documentos pesquisados. Antes do smoke integral, corrigir/validar o caminho de exclusão e definir tratamento das auditorias sintéticas; não desativar triggers/constraints nem apagar auditoria indiscriminadamente.

## Revisão dos 11 commits exclusivos da main

| Commit | Revisão |
|---|---|
| `ab40826` | Cobrança semanal, cálculos de data e testes; preservar código remoto |
| `d1c2509` | Merge PR 122; preservar ancestralidade |
| `21f1f79` | Seed financeiro específico de cliente real; fora dos fixtures; não reaplicar automaticamente |
| `a525c42` | Correção de nomes das colunas do cliente; incorporada no diff agregado |
| `b399b86` | Merge PR 123; preservar ancestralidade |
| `054510c` | Reconciliação de dados financeiros + policy ampla; bloqueio de segurança e replay dependente de dados reais |
| `6930277` | Merge PR 124; preservar ancestralidade |
| `0529afb` | Persistência separada de título/projeto de contrato e testes |
| `be8ea03` | Merge PR 125; preservar ancestralidade |
| `732ca71` | Preservação de IDs de parcelas, baixa financeira, reparo condicionado a data/valor; exige ensaio integrado |
| `8da21c3` | Merge PR 126; main remota preservada |

O diff agregado contém 12 arquivos, 615 inserções e 47 exclusões. Ausência de conflito textual não significa segurança. Não houve merge, force push nem aplicação das migrations financeiras. Testes pós-merge não foram executados porque o gate de integração não foi satisfeito.

## Reprodução sem secrets

```powershell
git fetch origin main
git rev-list --left-right --count origin/main...HEAD
git diff HEAD...origin/main -- src supabase/migrations
git merge-tree --write-tree HEAD origin/main
npx vercel env run -e production -- node scripts/p11-gateway-diagnostic.mjs
npx supabase projects list --output json
npx supabase backups list --project-ref uopxixfgaaxsgqgrfpvx --output json
npx supabase db query --linked "select policyname, qual from pg_policies where schemaname='public' and tablename='financial_recurring_rules'" --output json
npx supabase db query --linked "select has_table_privilege('authenticated','public.financial_recurring_rules','SELECT')" --output json
npx supabase db query --linked "select version from supabase_migrations.schema_migrations where version >= '20260829160000' order by version" --output json
```

O diagnóstico do Gateway faz uma chamada mínima ao modelo e poderá consumir créditos quando o billing estiver habilitado. Nunca registrar ambiente completo, tokens, headers de autenticação ou chaves.

## Decisões humanas necessárias

1. Autorizar a contenção financeira server-only e sua indisponibilidade funcional limitada.
2. Na equipe Vercel oficial, cadastrar método de pagamento válido em AI Gateway e habilitar créditos; não enviar dados de cartão/chaves pelo chat.
3. Confirmar o plano Supabase e autorizar, com orçamento, backup/restore isolado disponível. Nenhum novo projeto pago foi criado.
4. Aprovar retenção/tratamento da auditoria sintética antes do cleanup completo.

Documentação oficial consultada em 30/08/2026: [backups Supabase](https://supabase.com/docs/guides/platform/backups) e [restore em novo projeto](https://supabase.com/docs/guides/platform/clone-project). As características gerais não substituem configuração real. Backup PostgreSQL não inclui bytes de objetos Storage. Clone exige recursos elegíveis e custos próprios; Auth/configurações, Storage, Realtime e efeitos externos precisam de validação separada. RPO/RTO só poderão ser propostos para aprovação após conhecer o ponto recuperável e medir o ensaio.

Os relatórios finais solicitados serão concluídos após a resolução destes gates. Este documento não certifica fechamento do P11.
