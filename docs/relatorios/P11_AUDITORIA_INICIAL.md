# P11 — Auditoria inicial de produção

Data: 29/08/2026

Branch auditada: `codex/p4-p10-platform`

HEAD inicial: `3bbeb79`
Escopo: estado anterior a qualquer correção do P11

## Resumo executivo

O sistema possui uma base funcional ampla e controles relevantes de tenancy, RLS, imutabilidade e idempotência na fonte versionada. Entretanto, o estado inicial **não atende ao critério de release do P11**. Há bloqueadores externos de Git, Vercel e Supabase e um bloqueador arquitetural: as regras temporais do motor de automações dependem de uma chamada autenticada iniciada pelo navegador.

Esta auditoria não considera uma validação aprovada quando a evidência de produção não pôde ser obtida. Todos os itens nessa condição estão marcados como **BLOQUEADO — NÃO VALIDADO**.

## Evidências do estado inicial

- `git status --porcelain=v2 --branch`: branch `codex/p4-p10-platform`, HEAD `3bbeb79`; apenas `RELATORIO_COMPLETO_JOIA_OPS_P4_A_P10.txt` não rastreado, preservado como arquivo do usuário.
- `git rev-list --left-right --count main...HEAD`: branch 7 commits à frente e 0 atrás da `main` local.
- `git diff --stat main...HEAD`: 99 arquivos, 9.308 inserções e 1.463 remoções.
- Remote: `https://github.com/Gabriellageti/joia-insight-hub.git`.
- Vercel local: projeto `joia-labs`, `prj_78qSgARzs6cZaxPG1U5CtkjtwJ4C`, equipe antiga `team_rbqrTSDtplxmm5lB6ORLkqpd`, Node `24.x`.
- Conta Vercel visível na sessão: equipe `joia-solucoes-projects` (`team_615LDFPn5KZPxznrZihairVa`), com zero projetos listados.
- Projeto Supabase esperado: `uopxixfgaaxsgqgrfpvx`; todas as operações de leitura do conector retornaram `You do not have permission to perform this action`.
- Existem 66 migrations locais; a última é `20260829110500_p10_fix_event_column_scope.sql`.
- Variáveis locais encontradas, sem exibir valores: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`.
- A busca por secrets não encontrou valor de `service_role`, chave privada ou token de deploy versionado. Referências textuais legítimas existem em documentação, Edge Function e migrations.

## Achados classificados

### P0 — Bloqueadores de produção

#### P11-000 — Policies compiladas com correlação tautológica em Storage e CRM

- Estado: confirmado no catálogo real via `pg_policies` antes das correções.
- Evidência Storage: as policies compiladas continham `document.storage_path = document.name`, em vez de comparar `documents.storage_path` com `storage.objects.name`. Assim, o objeto solicitado não participava da autorização como pretendido.
- Evidência CRM: as policies compiladas continham `lead.workspace_id = lead.workspace_id`; o vínculo entre o workspace da linha comercial e o workspace da lead havia virado uma tautologia.
- Impacto: risco de acesso indevido a objeto privado por path conhecido e possibilidade de criar vínculos comerciais inconsistentes entre workspaces.
- Causa: colisão de nomes em expressões RLS com colunas externas não qualificadas.
- Correção requerida: recriar as policies com todas as referências externas qualificadas e confirmar a expressão compilada em `pg_policies`, além de executar testes ofensivos entre dois workspaces.

#### P11-001 — Git remoto inacessível e branch de produção sem P4–P10

- Estado: **BLOQUEADO — NÃO VALIDADO**.
- Evidência: a `main` está em `2d7b29d`; P4–P10 existem apenas nos sete commits posteriores da branch local. O remote configurado já havia retornado `Repository not found` e não há credencial/autorização nova nesta sessão.
- Impacto: Git não é ainda a fonte remota recuperável do release; perda do checkout local pode perder P4–P10.
- Necessário: responsável conceder acesso a `Gabriellageti/joia-insight-hub` ou informar o remote oficial acessível. Depois: push da branch, revisão, merge sem force push e confirmação do SHA de produção.

#### P11-002 — Projeto/deployment Vercel não controlável pela conta atual

- Estado: **BLOQUEADO — NÃO VALIDADO**.
- Evidência: `.vercel/project.json` aponta para equipe/projeto não visíveis; a única equipe retornada pelo conector possui zero projetos; as URLs existentes não puderam gerar acesso autenticado.
- Impacto: não é possível comprovar configuração, variáveis, branch de produção, proteção, logs, rollback ou executar E2E real.
- Necessário: acesso à equipe/projeto Vercel oficial ou transferência/vínculo do projeto para `joia-solucoes-projects`, preservando domínio e configuração.

#### P11-003 — Supabase de produção sem permissão de auditoria

- Estado: **BLOQUEADO — NÃO VALIDADO**.
- Evidência: projeto `uopxixfgaaxsgqgrfpvx` rejeitou `get_project`, migrations, tables, functions, extensions e advisors com erro de permissão.
- Impacto: schema real, drift, RLS, grants, backups, Auth, Storage, Cron, logs e migrations aplicadas não podem ser comprovados nesta execução.
- Necessário: conceder ao conector/conta acesso de leitura e migration ao projeto oficial; não fornecer secrets em chat.

#### P11-004 — Automações temporais dependem do navegador

- Estado: confirmado na fonte.
- Evidência: `src/hooks/useNotifications.ts` chama `run_scheduled_automations` ao abrir/focar e em `setInterval` de cinco minutos. Não há `cron.schedule` nas migrations. A RPC exige `auth.uid()` e workspace do usuário, portanto não pode ser executada em background sem contexto autenticado.
- Impacto: tarefas urgentes, projetos inativos, próximos passos vencidos e bloqueios prolongados não são processados quando ninguém abre o JoIA Ops.
- Correção requerida: um único executor server-side, preferencialmente Supabase Cron/`pg_cron`, com função interna dedicada, lock, idempotência, observabilidade e teste real sem navegador.

#### P11-005 — E2E autenticado e red team de produção indisponíveis

- Estado: **BLOQUEADO — NÃO VALIDADO**.
- Evidência: não há acesso ao deployment final nem credenciais/usuários E2E Admin, Gestor, Membro e Viewer em dois workspaces isolados.
- Impacto: login real, RLS ofensiva, Storage, multiaba, sessão, IA e smoke test não podem ser aprovados.
- Necessário: deployment acessível e usuários/dados E2E isolados; nunca usar dados reais.

### P1 — Alto

#### P11-006 — Assistente sem rate limiting de endpoint e sem limite HTTP pré-parse

- Evidência: `api/assistant.ts` valida conteúdo após `request.json()`, mas não limita `Content-Length`, frequência por usuário/workspace ou concorrência.
- Impacto: abuso acidental/malicioso, custo de IA e consumo de duração de Functions.
- Correção: limite proporcional, resposta 413 para payload grande, 429 com janela server-side e IDs de correlação.

#### P11-007 — Observabilidade parcial

- Evidência: Error Boundary global existe e evita tela branca, mas registra apenas `console.error`; a API de IA não produz correlation/request ID; inexiste health endpoint seguro; não há drain/provedor comprovado.
- Impacto: investigação de falhas de produção fica incompleta.
- Correção: logging sanitizado estruturado, correlation IDs, health check e documentação de retenção/consulta.

#### P11-008 — Runner pode deixar execução em `running` após exceção

- Evidência: `run_scheduled_automations` cria `automation_runs` como `running` e atualiza para `success`, porém não possui tratamento por item que persista `failed`/motivo quando uma ação falha.
- Impacto: falha de uma entidade pode abortar a transação/lote e reduzir a capacidade de diagnóstico.
- Correção: isolamento por regra/item e persistência de `failed` ou `skipped` com motivo sanitizado.

#### P11-009 — Duplicidade de clientes entre oportunidades concorrentes

- Evidência: `convert_lead_to_client` usa `FOR UPDATE` na oportunidade e evita dupla conversão da mesma lead, mas a pesquisa de duplicidade é consultiva e não existe, na fonte auditada, uma constraint normalizada que impeça duas leads diferentes concorrentes de criar o mesmo cliente.
- Impacto: duplicação possível por e-mail/telefone/nome sob corrida.
- Correção: normalização no banco, decisão explícita de chaves de negócio e teste concorrente. Não criar unicidade destrutiva sem avaliar dados atuais.

#### P11-010 — Headers de segurança ausentes

- Evidência: `vercel.json` contém apenas configuração de Function e rewrite SPA; não define CSP, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` ou `Permissions-Policy`.
- Impacto: defesa em profundidade incompleta.
- Correção: adicionar headers compatíveis com Supabase/Vercel AI Gateway e validar no deployment.

#### P11-011 — Backup e restore não comprovados

- Estado: **BLOQUEADO — NÃO VALIDADO**.
- Impacto: não há RPO/RTO, retenção ou procedimento de recuperação comprovado.
- Correção: verificar plano e política no projeto Supabase, registrar retenção real e executar restore em ambiente isolado quando disponível.

### P2 — Médio

#### P11-012 — Service Worker estático é conservador, mas logout/offline não foi atacado

- Evidência: `src/sw.js` precacheia somente artefatos do build e usa runtime cache apenas para Google Fonts. Não há cache explícito de Supabase, `/api`, signed URLs ou dados corporativos.
- Avaliação: desenho inicial adequado, porém o teste Usuário A → logout → Usuário B → offline ainda não foi executado.
- Correção/validação: adicionar teste automatizado de cache e sessão e inspecionar Cache Storage no logout.

#### P11-013 — Sessão persistida em `localStorage`

- Evidência: cliente Supabase configura `persistSession: true` com `storage: localStorage`.
- Impacto: padrão esperado para PWA, mas exige validação de logout multiaba, expiração, remoção de membro e XSS/CSP.
- Correção: manter apenas se os testes de sessão forem aprovados; não migrar armazenamento sem avaliar UX e arquitetura.

#### P11-014 — Funções `SECURITY DEFINER` legadas exigem inventário final real

- Evidência: migrations contêm funções privilegiadas; as mais novas normalmente fixam `search_path` e revogam `PUBLIC`, mas o catálogo final de `pg_proc.proacl` não pôde ser consultado.
- Impacto: migrations antigas podem ter sido substituídas, mantidas com grants amplos ou divergido da produção.
- Correção: consulta de catálogo no Supabase, justificativa função a função e migration corretiva baseada no estado final.

#### P11-015 — Node de produção localmente vinculado a 24.x sem validação no projeto efetivo

- Evidência: `.vercel/project.json` registra Node `24.x`, mas esse projeto não é acessível.
- Impacto: comportamento do build/runtime final não comprovado.
- Correção: pin de versão suportada e validação no projeto oficial, sem alterar antes de confirmar o runtime efetivo.

#### P11-016 — Dependências ainda não auditadas completamente

- Evidência: lockfile existe e nenhuma chave foi exposta; auditoria `npm audit`, pacotes não usados e compatibilidade ainda precisam ser executadas.
- Observação: React Router não será atualizado apenas para remover warning, conforme escopo.

### P3 — Baixo

#### P11-017 — Relatório TXT não rastreado

- Evidência: `RELATORIO_COMPLETO_JOIA_OPS_P4_A_P10.txt`.
- Impacto: nenhum impacto de runtime. É um artefato solicitado pelo usuário.
- Decisão: preservar e incluir no commit local do P11 por ser um artefato solicitado pelo usuário; sem efeito de runtime.

## Controles positivos já encontrados

- Tenancy com `workspace_id`, memberships e políticas fail-closed foi introduzida por migration dedicada.
- Funções privadas críticas recentes usam `SECURITY DEFINER SET search_path = ''` e nomes qualificados.
- Funções públicas críticas recentes revogam `PUBLIC`/`anon` e concedem apenas a `authenticated` quando necessário.
- `convert_lead_to_client` usa `FOR UPDATE` e retorna a conversão já existente para a mesma lead.
- `apply_project_template` usa constraints/`ON CONFLICT` para tarefas, etapas, documentos e instanciação.
- O runner usa advisory lock transacional e chaves de idempotência.
- A API da IA usa token do usuário, `getUser`, cliente Supabase com JWT do chamador, contexto via RPC/RLS e `Cache-Control: no-store`.
- A IA valida citações e IDs sugeridos contra o contexto autorizado e instrui o modelo a tratar dados como não confiáveis.
- Existe Error Boundary global com tentativa de recuperação.
- Service Worker não possui runtime cache de endpoints autenticados.
- Nenhum `service_role`, private key ou token de deploy foi encontrado no bundle-fonte versionado.

## Superfícies inventariadas

- Frontend React/Vite e PWA Workbox em `src/sw.js`.
- Vercel Function: `api/assistant.ts`.
- Edge Function local: `supabase/functions/notify-task-comment`.
- Banco: 66 migrations locais, RPCs, triggers, RLS, Storage e schemas `public`/`private`.
- Módulos críticos: Auth, clientes, projetos, tarefas, reuniões, documentos, templates, notificações, relatórios, IA, CRM e automações.

## Decisão após a Fase 1

**NO-GO inicial.** As correções locais podem prosseguir, mas o P11 somente poderá mudar de classificação após acesso ao Git remoto oficial, projeto Vercel correto, Supabase oficial e dados/usuários E2E isolados. Itens externos que continuarem sem acesso permanecerão como bloqueados e não validados no relatório final.

## Adendo de evidência obtida após a fotografia inicial

O conector de gestão do Supabase continuou sem permissão, mas a CLI vinculada possuía acesso SQL suficiente. Isso permitiu auditar e corrigir RLS, grants, cron e funções no projeto real. Portanto, o bloqueio P11-003 foi reduzido: schema e execução SQL foram validados, enquanto Auth administrativo, backups/PITR, logs de plataforma e advisors configuráveis continuam **BLOQUEADOS — NÃO VALIDADOS**.

Durante os ataques apareceram mais dois achados relevantes:

- **P11-000B — P0:** o trigger polimórfico de automações acessava `NEW.stage` em tabelas que não possuem essa coluna, bloqueando a criação real de cliente. A função foi substituída por ramificações específicas por tabela e leitura segura via `to_jsonb(NEW/OLD)`.
- **P11-018 — P1:** `complete_ai_interaction` permitia execução direta por usuário autenticado, possibilitando adulterar a conclusão do próprio registro de auditoria. A correção foi preparada em migration e API, porém propositalmente não aplicada: requer primeiro configurar `SUPABASE_SERVICE_ROLE_KEY` somente no backend e publicar a API compatível no mesmo rollout. Aplicar isoladamente quebraria a API atualmente publicada.
