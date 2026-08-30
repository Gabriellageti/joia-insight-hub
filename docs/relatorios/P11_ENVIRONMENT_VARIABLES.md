# P11 — Auditoria de variáveis de ambiente

Data: 29/08/2026

Projeto Vercel: `joia-solucoes-projects/joia-ops-live`

## Inventário

| Variável | Consumidor | Frontend/Backend | Development | Preview | Production | Sensível |
|---|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` | Frontend | `.env` | Necessária | Necessária | Não |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts` | Frontend | `.env` | Necessária | Necessária | Não; chave publicável protegida por RLS |
| `SUPABASE_URL` | `api/assistant.ts`, `api/health.ts` | Backend Vercel | Opcional; fallback local para `VITE_*` | Necessária | Necessária | Não |
| `SUPABASE_ANON_KEY` | `api/assistant.ts`, `api/health.ts` | Backend Vercel | Opcional; fallback local para `VITE_*` | Necessária | Necessária | Não; será preenchida com chave publicável moderna |
| `SUPABASE_SERVICE_ROLE_KEY` | cliente confiável de conclusão em `api/assistant.ts` | Backend Vercel | Não necessária para frontend; necessária em teste integrado da API | Necessária | Necessária | **Sim**; secret moderna, `BYPASSRLS` |
| `VERCEL_OIDC_TOKEN` | AI SDK/Vercel AI Gateway, injetada pela plataforma | Backend Vercel | Gerada por `vercel env pull` quando necessário | Automática | Automática | Sim; não cadastrar manualmente |
| `AI_GATEWAY_API_KEY` | Não lida explicitamente; alternativa automática do AI SDK | Backend | Não usada | Não cadastrar | Não cadastrar | Sim, se viesse a ser usada |
| `VITE_SUPABASE_PROJECT_ID` | Nenhum consumidor de runtime; apenas `.env` legado | Nenhum | Presente, mas não utilizada | Não cadastrar | Não cadastrar | Não |
| `CI` | Playwright configs | Ferramentas de teste | Opcional | Não cadastrar | Não cadastrar | Não |
| `ALLOWED_ORIGINS` | Edge Function `notify-task-comment` | Supabase Edge Functions | Conforme função | Fora da Vercel | Fora da Vercel | Não, mas restritiva |
| `RESEND_API_KEY` | Edge Function `notify-task-comment` | Supabase Edge Functions | Conforme função | Fora da Vercel | Fora da Vercel | Sim |
| `RESEND_FROM` | Edge Function `notify-task-comment` | Supabase Edge Functions | Conforme função | Fora da Vercel | Fora da Vercel | Não |
| `VAPID_PUBLIC_KEY` | Edge Functions de push | Supabase Edge Functions/frontend por endpoint dedicado | Conforme função | Fora da Vercel | Fora da Vercel | Não |
| `VAPID_PRIVATE_KEY` | Edge Function `notify-task-comment` | Supabase Edge Functions | Conforme função | Fora da Vercel | Fora da Vercel | Sim |
| `VAPID_SUBJECT` | Edge Function `notify-task-comment` | Supabase Edge Functions | Conforme função | Fora da Vercel | Fora da Vercel | Não |

## Decisões

- Somente cinco variáveis próprias serão cadastradas na Vercel: duas `VITE_*` públicas e três server-side.
- A variável denominada `SUPABASE_SERVICE_ROLE_KEY` receberá uma chave secreta moderna `sb_secret_*`, recomendada para backends, e nunca um valor `VITE_*`.
- O Assistente usa `generateText({ model: "openai/gpt-5.6-luna" })` com AI SDK 7. No ambiente Vercel, a autenticação efetiva é OIDC; o projeto possui `oidcTokenClaims` e a plataforma injeta `VERCEL_OIDC_TOKEN`. Não será inventada nem cadastrada `AI_GATEWAY_API_KEY`.
- Variáveis de Edge Functions pertencem ao cofre do Supabase e não serão copiadas para a Vercel.
- O secret administrativo não é lido por módulos em `src/`, não é prefixado com `VITE_`, não participa do build Vite e não aparece em respostas/logs.

## Verificações obrigatórias após publicação

1. Listar somente nomes/escopos na Vercel.
2. Procurar padrões de secret em `dist/` e nos chunks publicados.
3. Confirmar `/api/health` sem detalhes internos.
4. Confirmar que `/api/assistant` inicia e conclui audit trail após a migration.
