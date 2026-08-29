# P11 — Production Readiness Review

Data: 29/08/2026  
Branch: `codex/p4-p10-platform`  
Projeto: `joia-ops-live` / `joia-solucoes-projects`  
Domínio: `https://joia-ops-live.vercel.app`  
Deployment: `dpl_8EWobf18nNvFCRFwWbQUfvPtN2A4`  
Decisão formal: **NO-GO**

## Resumo executivo

O rollout coordenado foi executado no projeto oficial. A API compatível foi publicada e validada em deployment isolado; a migration `20260829164559_p11_ai_audit_server_boundary.sql` foi aplicada somente depois desse gate; o mesmo smoke autenticado passou após a migration; e então o deployment foi promovido ao domínio oficial.

O domínio está `Ready`, `/api/health` responde saudável, os headers de segurança estão presentes e a chave privilegiada Supabase permanece exclusivamente server-side. Storage, RLS, concorrência de CRM/templates, sessão, PWA, rate limit, request ID, fallback e audit trail receberam ensaios reais com fixtures sintéticas removidas ao final.

O resultado permanece **NO-GO**. O AI Gateway aceita OIDC, mas retorna 403 porque a equipe Vercel não possui cartão válido cadastrado para liberar créditos. A IA opera em fallback e os ensaios que dependem do modelo real continuam **BLOQUEADO — NÃO VALIDADO**. Backup/PITR/restore, GitHub e parte do smoke funcional visual de produção também seguem sem evidência completa. Não iniciar P12.

## Pontuação recalculada

| Área | Nota | Fundamentação |
|---|---:|---|
| Segurança | 90/100 | Boundary server-only, RLS, Storage e headers reais aprovados; IA real e Auth administrativo pendentes |
| Confiabilidade | 84/100 | Health, fallback, rate limit, sessão, multiaba e offline reais; falta longa duração/provedor |
| Integridade de dados | 92/100 | CRM/templates concorrentes produziram efeito único; matriz ofensiva sem falhas |
| Automação | 94/100 | Cron, locks, idempotência e health comprovados |
| PWA | 93/100 | Manifesto, SW, offline, logout/login e multiaba aprovados no domínio oficial |
| Observabilidade | 82/100 | Health, request IDs e audit trail reais; falta drain/alerta |
| Performance | 68/100 | Build/navegação aprovados; carga e Web Vitals reais pendentes |
| Deploy | 88/100 | Projeto, envs, build, promoção e domínio validados; GitHub/rollback completo pendentes |

## Environment Variables

A auditoria completa está em `P11_ENVIRONMENT_VARIABLES.md`. Nenhum valor secreto é reproduzido.

| Variável | Consumidor | Camada | Preview | Production | Sensível |
|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | SPA | Frontend | Configurada | Configurada | Não |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | SPA | Frontend | Configurada | Configurada | Não |
| `SUPABASE_URL` | `/api/assistant`, `/api/health` | Backend | Configurada | Configurada | Não |
| `SUPABASE_ANON_KEY` | APIs com RLS | Backend | Configurada | Configurada | Não |
| `SUPABASE_SERVICE_ROLE_KEY` | conclusão do audit trail | Backend | Encriptada | Encriptada | **Sim** |
| `VERCEL_OIDC_TOKEN` | AI Gateway | Plataforma/backend | Automática | Automática | **Sim** |
| `AI_GATEWAY_API_KEY` | nenhum | Não utilizada | Não configurada | Não configurada | Seria sensível |
| `VITE_SUPABASE_PROJECT_ID` | nenhum runtime | Não utilizada | Não configurada | Não configurada | Não |

`SUPABASE_SERVICE_ROLE_KEY` não possui prefixo `VITE_`, não é referenciada no frontend, não foi incluída no bundle, não é devolvida por endpoint e não aparece em logs. O nome legado é apenas o contrato da aplicação; o valor configurado é uma chave secreta moderna do Supabase.

## AI Gateway / OIDC

- O código usa AI SDK 7 com `openai/gpt-5.6-luna`, sem provider/API key própria.
- A Vercel injeta `VERCEL_OIDC_TOKEN`; não foi inventada `AI_GATEWAY_API_KEY`.
- Uma chamada direta alcançou o Gateway e retornou HTTP 403: é necessário cadastrar cartão válido na equipe para liberar créditos.
- Isso comprova OIDC efetivo e identifica billing como o bloqueio, não ausência de secret.

## Rollout da API e migration

1. API P11 preparada com janela de compatibilidade pré-migration.
2. `npm run check`: lint, typecheck, 136 unitários, 9 componentes, build e PWA — PASS.
3. Deployment isolado `Ready`.
4. Smoke pré-migration — PASS; fallback controlado e audit concluído.
5. Migration aplicada e registrada no histórico remoto.
6. Catálogo pós-migration: assinatura antiga ausente; `authenticated=false`, `anon=false`, `service_role=true` para `EXECUTE`.
7. Smoke pós-migration — PASS, provando acesso server-side ao secret.
8. Promoção para `https://joia-ops-live.vercel.app`.
9. Smoke no domínio oficial — PASS.

Não houve falha da API/boundary que exigisse rollback. Uma reversão completa exigiria restaurar também a assinatura antiga conforme `P11_ROLLBACK.md`; reverter somente a aplicação deixaria a API antiga incompatível com o banco endurecido.

## Headers no domínio real

| Controle | Resultado |
|---|---|
| CSP | PASS |
| `frame-ancestors 'none'` | PASS |
| `X-Frame-Options: DENY` | PASS |
| `X-Content-Type-Options: nosniff` | PASS |
| `Referrer-Policy: strict-origin-when-cross-origin` | PASS |
| `Permissions-Policy` restritiva | PASS |
| Supabase, API e assets | PASS — app/health 200 e navegação sem erro runtime |

## Testes reexecutados

### Storage real

| Teste | Resultado |
|---|---|
| Signed URL Usuário A | PASS |
| Usuário B tenta assinar objeto do A | PASS — negado |
| Usuário B usa path conhecido | PASS — negado |
| Usuário B tenta versão antiga | PASS — negado |
| URL assinada expirada | PASS — download recusado |

### REST/RPC e RLS

- Matriz remota transacional: **28 PASS, 0 FAIL**, com rollback das fixtures.
- Abrange ataques cross-workspace a cliente, projeto, tarefa, reunião, documento, relatório, CRM, automações e contexto da IA.
- `complete_ai_interaction` por cliente `authenticated` foi negada após a migration.
- Clientes atacantes não usaram chave administrativa; o backend de teste a usou somente para criar, verificar e remover fixtures.

### Concorrência real

| Teste | Resultado |
|---|---|
| Duas conversões simultâneas da mesma oportunidade | PASS — mesmo cliente, uma atividade |
| Duas aplicações simultâneas do mesmo template | PASS — uma tarefa, uma instanciação, retornos `[1,0]` |

### IA

| Teste | Resultado |
|---|---|
| Pergunta comum | PASS em fallback |
| Contexto cross-workspace cliente/reunião/relatório | PASS — negado |
| Fallback | PASS e auditado |
| Erro do provedor | PASS como resiliência; causa real 403 billing |
| Rate limit | PASS — 11ª solicitação bloqueada |
| Request ID | PASS |
| Conclusão do audit trail | PASS antes/depois da migration |
| Contexto autorizado completo e fontes geradas | **BLOQUEADO — NÃO VALIDADO** |
| Sugestão de tarefa e confirmação humana com resposta real | **BLOQUEADO — NÃO VALIDADO** |
| Prompt injection/exfiltração/instrução hostil contra modelo real | **BLOQUEADO — NÃO VALIDADO** |

Testes locais cobrem fontes, sugestões sem mutação automática e revisão humana, mas não substituem evidência do provedor real.

### Sessão/PWA no domínio oficial

- 12/12 rotas principais renderizadas;
- login, logout, novo login e persistência: PASS;
- multiaba: PASS;
- manifesto `standalone` e service worker: PASS;
- recarga offline: PASS;
- erros de runtime: 0.

`npm run test:e2e` também passou **15/15**, cobrindo localmente Meu Dia, reunião/decisão/conversão em tarefa, documento, template, Kanban, relatório, IA contratual, CRM, notificações e automações.

## Smoke solicitado

| # | Fluxo | Evidência |
|---:|---|---|
| 1 | Login | PASS produção |
| 2 | Meu Dia | Render real PASS; operação local PASS |
| 3 | Cliente E2E | Rota PASS; CRUD real **BLOQUEADO — NÃO VALIDADO** |
| 4 | Projeto | Rota PASS; fluxo real **BLOQUEADO — NÃO VALIDADO** |
| 5 | Template | Concorrência real PASS; visual local PASS |
| 6 | Tarefa | Rota real e CRUD local PASS |
| 7 | Kanban | Rota real e persistência local PASS |
| 8 | Reunião | Rota real e operação local PASS |
| 9 | Decisão | Local PASS; produção completa **BLOQUEADO — NÃO VALIDADO** |
| 10 | Conversão em tarefa | Local PASS; produção completa **BLOQUEADO — NÃO VALIDADO** |
| 11 | Documento | Storage real PASS; upload visual **BLOQUEADO — NÃO VALIDADO** |
| 12 | Relatório | Rota real e geração local PASS |
| 13 | IA | API/fallback/audit real PASS; geração real **BLOQUEADO — NÃO VALIDADO** |
| 14 | Oportunidade | Conversão concorrente real PASS |
| 15 | Follow-up | Rota real; operação completa **BLOQUEADO — NÃO VALIDADO** |
| 16 | Conversão CRM | PASS produção concorrente |
| 17 | Automação | Rota, cron e health PASS |
| 18 | Notificação | Local PASS; entrega externa **BLOQUEADO — NÃO VALIDADO** |
| 19 | Logout | PASS produção |
| 20 | Login | PASS produção |
| 21 | Persistência | PASS produção |

Somente dados sintéticos `example.invalid` e workspaces P11 foram usados e removidos. Um objeto órfão do primeiro diagnóstico de Storage foi identificado exatamente e removido pela API.

## Evidência consolidada

| Ensaio | Resultado |
|---|---|
| `npm run check` | PASS |
| `npm run test:e2e` | 15 PASS |
| Build Vercel | PASS |
| `/api/health` oficial | 200 / healthy |
| Smokes IA pré/pós migration/oficial | PASS |
| Grant da RPC | somente `service_role` |
| Rate limit real | PASS |
| Matriz ofensiva | 28 PASS, 0 FAIL |
| Storage | 5/5 PASS |
| CRM concorrente | PASS |
| Template concorrente | PASS |
| Browser oficial | 12/12 rotas, sessão/PWA PASS |
| Headers | PASS |
| AI Gateway generativo | **BLOQUEADO — 403 billing/cartão** |
| GitHub oficial | **BLOQUEADO — `Repository not found` para `gustavosantosfip`** |
| Backup/PITR/restore | **BLOQUEADO — NÃO VALIDADO** |

## Pendências para GO

1. Cadastrar método de pagamento válido na equipe Vercel e repetir a matriz generativa, prompt injection e conteúdo hostil armazenado.
2. Executar no domínio oficial os fluxos visuais completos ainda marcados como bloqueados.
3. Comprovar backup/PITR, retenção, RPO/RTO e restore isolado no Supabase.
4. Corrigir o acesso/remote GitHub e publicar os commits sem force push.
5. Configurar drain/alertas e executar carga/Web Vitals.
6. Confirmar proteção contra senhas vazadas e tratar o drift histórico separadamente.

# NO-GO

O P11 está publicado e operacional no domínio oficial, mas publicação não equivale a prontidão. IA generativa, recuperação de dados, GitHub e parte do smoke funcional real impedem GO. A classificação permanece **NO-GO** e o P12 não deve ser iniciado.
