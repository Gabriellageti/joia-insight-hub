# P11 — Plano de rollback e recuperação

## Princípios

- Migrations P11 devem ser aditivas ou substituir policies/funções de forma transacional.
- Nenhuma migration P11 deve remover dados de negócio.
- Cada correção de policy deve ser aplicada em `BEGIN/COMMIT`; erro de compilação reverte todo o lote.
- O artefato de frontend anterior deve permanecer promovível na Vercel até a aprovação do smoke test.

## Antes de migrations

1. Registrar SHA Git, versão da migration e timestamp.
2. Confirmar o estado do projeto e a política real de backup/PITR do Supabase.
3. Para correções urgentes não destrutivas, guardar a definição anterior por `pg_get_expr`/`pg_get_functiondef` e manter SQL reverso neste documento.
4. Não executar migrations destrutivas enquanto backup/restore estiver **BLOQUEADO — NÃO VALIDADO**.

## Rollback da migration `p11_storage_crm_policy_hardening`

A migration apenas substitui policies e grants; não altera dados. O rollback preferencial é promover uma migration corretiva nova, nunca apagar o registro histórico. Se houver regressão funcional, restaurar as policies anteriores a partir de `20260829021434_p4_document_central.sql` e `20260829100000_p9_commercial_crm.sql`, mantendo `REVOKE ALL ... FROM PUBLIC, anon` em `run_scheduled_automations` por ser hardening independente.

Observação: as policies anteriores contêm o defeito de correlação e **não devem ser restauradas em produção** salvo para diagnóstico isolado e imediatamente seguido de uma policy fail-closed. O rollback operacional seguro é negar temporariamente acesso ao bucket/mutações comerciais, corrigir a expressão e publicar uma migration sucessora.

## Rollback de frontend/API

- Validar um preview imutável antes da promoção.
- Promover o deployment validado; não reconstruir artefato diferente para produção.
- Em falha, usar rollback/promoção do último deployment aprovado.
- Migrations P11 devem permanecer compatíveis com o frontend anterior; quando isso não for possível, usar flag fail-closed e rollout em duas fases.

## Rollout/rollback da boundary da auditoria da IA

`20260829164559_p11_ai_audit_server_boundary.sql` não foi aplicada. Ela altera a assinatura/grant de `complete_ai_interaction` e exige a nova API com `SUPABASE_SERVICE_ROLE_KEY` server-only. Procedimento seguro:

1. cadastrar a variável somente na Function de Preview/Production;
2. publicar e testar a API compatível em Preview;
3. registrar deployment e definição atual da função;
4. aplicar a migration no change window;
5. testar uma interação `success`, uma `fallback` e uma `error`;
6. em regressão, restaurar temporariamente a assinatura anterior e promover o deployment anterior, registrando o risco de adulteração até nova tentativa.

Nunca inserir `SUPABASE_SERVICE_ROLE_KEY` como variável `VITE_*`.

## Migrations P11 aplicadas

As migrations `163214`, `163736`, `164116`, `165324` e `165722` são não destrutivas e constam no histórico real. O rollback deve ser sempre uma nova migration:

- policies: corrigir ou fechar acesso; não restaurar as expressões tautológicas;
- cron: desativar somente o job `joia-p11-temporal-automations` e manter logs/health;
- runner: manter grants revogados e voltar para comportamento fail-closed;
- trigger polimórfico: desabilitar o trigger específico afetado em vez de restaurar a função que referencia campos inexistentes.

## Estado atual

- Backup/PITR Supabase: **BLOQUEADO — NÃO VALIDADO** por falta de permissão no conector de gestão.
- Rollback Vercel: **BLOQUEADO — NÃO VALIDADO** porque o projeto oficial não está visível para a conta conectada.
- Recuperação Git: branch local preserva P4–P10, mas o remote continua inacessível.
