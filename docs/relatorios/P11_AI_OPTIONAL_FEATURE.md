# P11 — Assistente opcional desabilitado

Data: 30/08/2026. Branch: `codex/p4-p10-platform`, base local `63914b2`. Sem push, merge, deployment ou migration nesta alteração. Nenhum billing contratado/ativado/contornado e nenhuma solicitação de geração ao Gateway.

## Decisão vigente

IA disponível nesta release: **NÃO**. Dependência do núcleo da IA: **NENHUMA**. Estado: **FEATURE OPCIONAL DESABILITADA**. Geração real, prompt injection contra modelo, exfiltração pelo modelo, fontes e sugestões geradas são **ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO**. Não são PASS; deixam de integrar os requisitos de GO somente enquanto o recurso não for disponibilizado.

## Implementação

- `api/assistant.ts`: apenas `process.env.AI_ASSISTANT_ENABLED === "true"` habilita. GET publica somente disponibilidade. GET/POST desligados retornam HTTP 200, `enabled:false`, `AI_ASSISTANT_DISABLED`, `Cache-Control:no-store` e request ID. O retorno ocorre antes de ler corpo, credenciais, sessão, banco, contexto, audit trail, fallback e provedor. Não registra falsa geração ou falha operacional.
- `src/pages/Assistant.tsx`: estado com texto exato solicitado e navegação para Meu Dia, sem campo/botão de geração. A consulta de disponibilidade tem limite de 5 segundos e cancelamento; erro/timeout falha fechado. O componente habilitado só é montado após autorização do servidor, impedindo histórico/auto-prompts/sugestões no caminho off.
- `src/lib/ai/assistant.ts`: consulta GET sem cache e erro tipado para receber desativação entre disponibilidade e envio. Não converte estado off em resposta/fallback.
- Scripts antigos de diagnóstico e smoke generativo também param antes de chamadas/fixtures se não houver `true` explícito.
- API, migrations, RLS, fontes, sugestões, histórico, integração OIDC, rate limit e conclusão confiável do audit trail foram preservados. Nenhuma mudança de schema/permissões nesta rodada.
- `.env.example` documenta o valor `false` e separa credenciais server-side das públicas.

## Vercel: configuração versus deployment

Projeto confirmado pelo vínculo local: `joia-solucoes-projects/joia-ops-live`, ID `prj_LGZhDd81ItPTUqxYjh4XNF8xSygm`. Inventário anterior não tinha a flag. Criada apenas essa nova chave em Preview (todos os branches) e Production; verificação posterior dos valores retornou `Disabled=true` nos dois escopos. Nenhum secret existente sobrescrito.

O CLI de Preview solicitou branch mesmo usando a forma documentada para todos os branches; a criação foi concluída pela API oficial, com `target:["preview"]`, sem branch override. Production foi cadastrado pelo CLI. Isso não alterou billing.

**Não houve deployment nesta rodada. A versão anterior não implementa o gate e pode continuar tentando geração.** A variável configurada não comprova que o domínio atual esteja desligado. A publicação coordenada do novo código e a validação UI/API no domínio oficial permanecem **BLOQUEADO — NÃO VALIDADO**. Não promover o candidato completo apenas por este resultado local.

## Evidências executadas

| Verificação | Resultado e alcance |
|---|---|
| `npm run check` | PASS: lint, TypeScript, 147 testes unitários, 9 testes de componentes, build e verificação de manifesto/SW |
| 8 novos testes do handler real | PASS: ausência/false/vazio/TRUE/1/espaços falham fechado; GET e POST repetidos; override por query/header/body ignorado; corpo não lido; zero fetch externo; zero logs de geração/falha; request ID/no-store; opt-in true preserva autenticação |
| `npm run test:e2e` final | PASS: 18/18, 1,4 minuto, backend simulado; inclui 22 rotas responsivas e fluxos locais de tarefas/Kanban, reuniões, relatório, CRM e notificações |
| E2E mobile desligado | PASS em 375px: texto exato, sem campo/botão/histórico, auto=1 não envia POST, zero requests ao provedor/histórico e zero escritas de tarefa; navegação para Resumo do dia preservada |
| E2E timeout | PASS: disponibilidade pendente termina com estado honesto, sem liberar geração |
| E2E mudança entre GET/POST | PASS: resposta off desmonta a interface habilitada sem apresentar fallback nem novos envios |
| `npm run test:pwa:e2e` | PASS: 3/3 sobre build, instalação/offline/iPhone e ausência de cache de APIs autenticadas |
| Scripts legados com flag false | PASS: ambos retornaram `enabled:false`, código de feature desligada e `checks:[]`, sem exigir credenciais ou criar fixtures |
| Inspeção visual | Login local renderizado sem erros pelo agent-browser; screenshot da tela desligada mobile inspecionado, sem overflow |
| Bundle | Sem identificador `SUPABASE_SERVICE_ROLE_KEY` ou `AI_ASSISTANT_ENABLED`; busca por `sb_secret_` encontrou somente dois prefixos literais do SDK, não valores de credenciais |
| Produção/faturamento | Nenhuma geração disparada nesta rodada. Zero chamadas no handler instrumentado implica zero consumo nesse ensaio; não é conciliação do extrato financeiro nem prova de tráfego de outros usuários no deployment antigo |

Logs locais: `tmp/p11-optional-ai-check.log`, `tmp/p11-optional-ai-e2e.log` (primeira bateria), `tmp/p11-optional-ai-e2e-repeat.log` (final), `tmp/p11-optional-ai-pwa.log`. Screenshot: `tmp/p11-assistant-disabled-mobile.png`. Esses arquivos temporários não são evidência versionada permanente; resultados e limites estão registrados neste relatório.

## Falhas preparatórias e correções

1. Mock de `fetch` do Bun exigia a propriedade `preconnect` no typecheck; corrigido antes do check final.
2. Worktree de integração sob `tmp/` era incluído pelo filtro amplo `bun test src` e lint. Script mudou para `bun test ./src`, e lint exclui `tmp/**`, evitando contar testes do candidato como testes desta branch. A contagem atual não deve ser comparada com a do candidato financeiro.
3. Primeira invocação E2E encontrou porta ocupada pelo servidor da inspeção visual; servidor encerrado antes da suíte.
4. Primeira bateria completa: 17/18; teste novo esperava heading "Meu Dia", mas a página usa saudação. Snapshot mostrou página funcional; seletor corrigido para região "Resumo do dia". Nova bateria 18/18. A intermitência histórica da rodada anterior não foi apagada nem declarada resolvida por esta correção.
5. PDF regenerado pela suíte foi restaurado ao original; nenhuma alteração incidental do artefato foi mantida.

## Prontidão recalculada

**NO-GO permanece sem usar billing/IA generativa como causa.** Bloqueadores: recuperação/backup/restore conforme capacidade real; smoke integral produtivo das funcionalidades habilitadas; integridade financeira e revisão de retenção/cleanup dos demais históricos. A segurança da feature desligada também deve ser comprovada no deployment antes da operação desta release.

Nenhum dado real da empresa foi usado nos testes desta alteração; o núcleo foi verificado localmente com fixtures/mocks, não certificado integralmente em produção. Reativação requer nova decisão de negócio e o [runbook](../runbooks/ENABLE_AI_ASSISTANT.md). **P12 não iniciado.**
