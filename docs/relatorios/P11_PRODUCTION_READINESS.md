# P11 — Production Readiness Review

Data: 29/08/2026

Branch: `codex/p4-p10-platform`

Decisão formal: **NO-GO**

## Resumo executivo

O P11 reduziu riscos graves e comprovou no banco real o isolamento central: duas policies compiladas incorretamente foram corrigidas; o motor temporal deixou de depender do navegador e passou a executar por `pg_cron`; o trigger de automações que bloqueava criação de clientes foi reparado; o runner manual passou a exigir Gestor; sessão/PWA/API foram endurecidos; e a matriz ofensiva fechou com **29 PASS e 0 FAIL**.

Mesmo assim, o sistema **não pode ser declarado pronto para uso oficial**. GitHub e Vercel continuam fora do controle da conta atual, o deployment final não foi publicado/testado, o E2E autenticado de produção não ocorreu, backup/PITR não foi comprovado e a fronteira server-only da auditoria da IA ainda aguarda rollout coordenado. Nenhum desses itens foi transformado artificialmente em aprovação.

## Pontuação

| Área | Nota | Fundamentação |
|---|---:|---|
| Segurança | 78/100 | RLS real atacada, grants e policies críticas corrigidos; faltam HTTP/E2E final, IA real e Auth administrativo |
| Confiabilidade | 72/100 | Suítes locais verdes, Error Boundary e recuperação; faltam longa duração, multiaba e falhas reais de produção |
| Integridade de dados | 80/100 | Constraints/RLS/imutabilidade aprovadas no SQL; concorrência completa de CRM/templates/documentos não executada por API |
| Automação | 94/100 | Cron real ativo, três execuções recentes aprovadas, lock/idempotência e health comprovados |
| PWA | 86/100 | Instalação/offline/cache sensível aprovados localmente; atualização entre deployments e troca A/B real pendentes |
| Observabilidade | 68/100 | Health, request IDs, logs sanitizados e `automation_runs`; plataforma/log drain não acessíveis |
| Performance | 66/100 | Build dividido por rotas e lint DB; faltam métricas reais, carga e EXPLAIN das rotas quentes |
| Deploy | 20/100 | Build local aprovado, mas projeto Vercel, domínio, envs, proteção, promoção e rollback não controlados |

## Estado inicial

- P4–P10 estavam em sete commits locais após a `main`, com remote GitHub inacessível.
- `.vercel/project.json` referenciava um projeto/equipe não visíveis na conta conectada.
- Automações temporais eram acionadas por abertura/foco/intervalo do navegador.
- Storage e CRM tinham policies cuja expressão compilada perdia a correlação de workspace/path.
- A Function da IA não limitava o corpo HTTP e não tinha request ID estruturado.
- Não havia health endpoint nem política de headers em `vercel.json`.
- O Service Worker já era conservador: apenas shell estático e Google Fonts.

Detalhes e classificação P0–P3 estão em `P11_AUDITORIA_INICIAL.md`.

## Problemas e vulnerabilidades encontrados

### Corrigidos

- **P0:** Storage comparava colunas da mesma linha de documento e não o path do objeto solicitado.
- **P0:** CRM comparava `lead.workspace_id` consigo mesmo.
- **P0:** trigger polimórfico acessava campos inexistentes e impedia INSERT em clientes.
- **P0 arquitetural:** automações temporais dependiam do navegador.
- **P1:** runner público tinha grant implícito amplo e não impunha papel Gestor.
- **P1:** runner antigo não isolava/persistia falha por item adequadamente.
- **P1:** payload da IA podia ser parseado sem limite de bytes.
- **P1:** ausência de request/correlation ID, logs sanitizados e health endpoint.
- **P1:** ausência de headers de defesa em profundidade.
- **P2:** rascunhos locais e cache React Query não eram explicitamente limpos na troca de sessão.

### Pendentes

- **P0:** fonte remota GitHub inacessível.
- **P0:** deployment Vercel oficial inacessível e não publicado.
- **P0:** E2E autenticado e smoke test no domínio final não executados.
- **P1:** `complete_ai_interaction` continua diretamente executável por `authenticated` no banco real; migration corretiva aguarda API/env coordenadas.
- **P1:** backup/PITR e restore não comprovados.
- **P1:** proteção contra senhas vazadas do Supabase Auth aparece desabilitada no advisor e exige acesso administrativo.
- **P1:** duplicidade por chaves de negócio entre leads diferentes continua sem constraint definida; a regra precisa de decisão de dados antes de criar unicidade.
- **P2:** drift histórico anterior a julho entre versões locais/remotas; P4–P11 recentes estão alinhadas, exceto a migration de IA deliberadamente pendente.
- **P2:** oito funções legadas `SECURITY DEFINER` usam `search_path` incluindo `public`; não há grant `PUBLIC`/`anon`, mas devem migrar para path vazio em manutenção controlada.

## Correções realizadas

### Banco aplicado no projeto real

1. `20260829163214_p11_storage_crm_policy_hardening.sql`: recria policies com aliases externos qualificados; revoga runner de `PUBLIC`/`anon`.
2. `20260829163736_p11_server_side_automation_runner.sql`: habilita `pg_cron`, cria runner global/por workspace, lock, idempotência, isolamento de falhas e job a cada cinco minutos.
3. `20260829164116_p11_health_observability.sql`: registra saúde do scheduler e expõe somente estado genérico.
4. `20260829165324_p11_automation_manual_manager_boundary.sql`: execução manual exige nível de Gestor ou superior.
5. `20260829165722_p11_safe_polymorphic_automation_trigger.sql`: corrige trigger genérico sem acessar campos inexistentes.

As cinco aparecem na tabela real `supabase_migrations.schema_migrations`.

### Banco preparado, não aplicado

`20260829164559_p11_ai_audit_server_boundary.sql` remove a conclusão de auditoria da IA do papel `authenticated` e a concede somente a `service_role`. É uma alteração correta, mas incompatível com a API antiga em produção. Sequência obrigatória: cadastrar `SUPABASE_SERVICE_ROLE_KEY` somente em Preview/Production backend, publicar a API P11, aplicar a migration no mesmo change window e executar smoke test/rollback. Estado: **BLOQUEADO — NÃO VALIDADO**.

### Aplicação/API/PWA

- `api/assistant.ts`: limite de 64 KiB por `Content-Length` e stream, content type, respostas 413/415/429, request ID, duração e logs sem prompt/token/cookie.
- `api/health.ts`: GET/HEAD com timeout, `no-store` e status genérico de API, banco e scheduler.
- `vercel.json`: CSP, anti-framing, nosniff, referrer e permissions policy; validação no domínio final pendente.
- `src/hooks/useNotifications.ts`: remove execução temporal pelo navegador; mantém apenas atualização de notificações.
- `src/lib/session-security.ts`: remove rascunhos confidenciais, limpa `sessionStorage` e solicita purge privado ao Service Worker.
- `src/App.tsx`: limpa React Query quando o usuário muda ou encerra sessão.
- `src/sw.js`: recebe `PURGE_PRIVATE_DATA`; nenhuma estratégia persiste endpoints autenticados.

## Testes ofensivos

- Script SQL transacional no projeto real: **29 PASS, 0 FAIL**.
- Abrange clientes, projetos, tarefas, reassignment, reunião, documento, path conhecido de Storage, relatório finalizado, CRM, automações e contexto da IA.
- Controle positivo provou que Admin B acessa o próprio workspace.
- Fixtures revertidos deliberadamente; nenhum dado E2E persistiu.
- Evidência detalhada em `P11_SECURITY_ATTACK_MATRIX.md`.

Signed URL real, REST no domínio, versão antiga, conversão CRM completa e prompt injection pelo modelo permanecem **BLOQUEADOS — NÃO VALIDADOS**.

## Auditoria `SECURITY DEFINER`

O catálogo real contém 49 funções `SECURITY DEFINER` nos schemas `public`/`private`:

- 41 usam `search_path=""`;
- 8 legadas incluem `public` no path;
- 0 são executáveis por `PUBLIC`;
- 0 são executáveis por `anon`;
- helpers/trigger/runner privados não expostos permanecem sem execução autenticada;
- RPCs expostas validam `auth.uid`, workspace e/ou papel no corpo.

Achado aberto: `public.complete_ai_interaction` ainda é executável por `authenticated`; correção pronta e não aplicada pelo motivo de rollout descrito acima. O runner manual, `begin_ai_interaction`, CRM e refresh de notificações são exposições intencionais com autorização interna. Funções de trigger justificam `SECURITY DEFINER` para escrita auditável/imutável e têm execução direta revogada.

## RPCs e endpoints

- `/api/assistant`: autentica token com `getUser`, monta contexto via sessão RLS, valida UUIDs/payload, possui rate limit de 10 interações/minuto no início transacional e limite HTTP de 64 KiB. O cliente confiável fica reservado à conclusão do audit trail.
- `/api/health`: somente leitura de estado genérico, timeout de 3 s, sem detalhes internos.
- Edge Function `notify-task-comment`: inventariada; valida assinatura/segredo no servidor e usa fluxo de claim/release. Execução real de produção não pôde ser observada.
- RPCs críticas rejeitam `anon`; `PUBLIC` implícito foi removido do runner.

## Testes de concorrência e idempotência

- Dez chamadas sequenciais no mesmo comando SQL mantiveram 12 `automation_runs` e zero falhas: nenhuma notificação/efeito duplicado.
- Duas instâncias do runner foram disparadas em paralelo; o advisory lock serializou o workspace e não houve crescimento do conjunto idempotente.
- O design usa chave única de idempotência, advisory lock transacional, `correlation_id`, `causation_id` e profundidade máxima para proteção contra loop.
- CRM mesma lead possui `FOR UPDATE` e retorno da conversão existente; templates usam constraints/`ON CONFLICT`. A concorrência HTTP real dessas rotas não foi executada e permanece bloqueada.

## Testes de automações

- Job `joia-p11-temporal-automations` ativo em `*/5 * * * *`.
- Execuções reais às 17:00, 17:05 e 17:10 UTC: três `succeeded` consecutivas.
- Health mais recente: `automation-scheduler=healthy`.
- O primeiro ciclo real processou um workspace e encontrou 12 efeitos já deduplicados, comprovando execução sem navegador.
- Falhas por item são registradas em `automation_runs` com estado/motivo sanitizado; o health captura falha global.

## Testes de PWA

- Manifesto, prompt instalável, orientação iPhone e navegação offline: aprovados.
- Cache Storage foi inspecionado após resposta privada sintética: nenhum `/api`, `/rest/v1` ou `/auth/v1` persistido.
- Após remoção da interceptação e entrada offline, a API privada retornou erro de rede, não resposta cacheada.
- Logout remove rascunhos de reunião, `sessionStorage`, cache em memória por usuário e caches privados nomeados; preferência de instalação e estado Auth gerenciado pelo Supabase não são apagados indevidamente.
- Atualização v1 → novo deployment e troca real Usuário A → B permanecem bloqueadas sem deployment/contas E2E.

## Testes da IA

- Testes unitários confirmam contexto via JWT/RLS, fontes rastreáveis, fallback honesto e ausência de mutação automática.
- Ataques SQL a contexto de cliente/reunião/relatório de outro workspace foram negados.
- Prompt trata contexto e histórico como dados não confiáveis e proíbe afirmar que executou ações.
- Gateway/OIDC/modelo, timeout do provedor, prompt injection e custo no deployment real: **BLOQUEADOS — NÃO VALIDADOS**.

## Performance

- Build de produção aprovado e rotas carregadas de forma lazy.
- O precache PWA contém 137 entradas, cerca de 3,47 MiB.
- Há chunks grandes: núcleo aproximadamente 466–485 KiB, indicadores aproximadamente 403 KiB e jsPDF aproximadamente 399 KiB antes de gzip. A divisão por rota limita impacto inicial, mas merece orçamento de bundle.
- `db lint` encontrou somente warning legado em `create_financial_recurring_expense`: variável `month_offset` sombreada/não usada.
- Métricas Web Vitals, carga, N+1 e `EXPLAIN ANALYZE` em volume real não foram executados; sem índices especulativos adicionados.

## Observabilidade

- Error Boundary global com retry e reset por rota já existia e foi aprovado em componentes/E2E sem telas brancas.
- IA passa `X-Request-Id`, registra rota/status/duração/user ID e omite conteúdo sensível.
- Automação mantém execução, resultado, timestamps, erro sanitizado e health.
- Health endpoint não expõe segredo ou mensagem SQL detalhada.
- Vercel logs/drain, retenção e alertas: bloqueados pelo acesso ao projeto.

## Dependências

`npm audit` encontrou 0 critical, 0 high, 2 moderate. Ambas derivam do React Router 6; a correção automática exige migração major para 7. O risco SSR hydration não se aplica à SPA Vite atual. O open redirect deve ser mitigado evitando navegação para entrada externa não validada e resolvido em atualização planejada. Conforme o escopo, não houve upgrade major apenas para remover warning.

## Backup e rollback

- Backup/PITR, retenção e restore: **BLOQUEADO — NÃO VALIDADO** por ausência de acesso administrativo ao projeto Supabase.
- As migrations aplicadas são não destrutivas e transacionais; não removem dados de negócio.
- O plano de reversão/fail-closed está em `P11_ROLLBACK.md`.
- Rollback/promoção Vercel não pode ser testado sem o projeto oficial.

## Deployment, Git/GitHub, Vercel e Supabase

### Git/GitHub

- Remote: `https://github.com/Gabriellageti/joia-insight-hub.git`.
- Conta ativa do GitHub CLI: `gustavosantosfip`; contas `Gabriellageti` e `joiasolucoes-alt` existem localmente, mas não estão ativas.
- Erro: `Repository not found`.
- Necessário: conceder acesso à conta correta ou informar o remote oficial. Depois executar fetch, push da branch, PR/revisão, merge sem force push e confirmar SHA.

### Vercel

- Vínculo local antigo: projeto `joia-labs`, equipe antiga não visível.
- Equipe disponível: “Joia Solucoes' projects”, zero projetos listados.
- Não foi possível validar domínio, Deployment Protection, envs Development/Preview/Production, Node efetivo, headers, Functions, logs, branch de produção ou rollback.
- Necessário: acesso/transferência ao projeto oficial; não remover proteção sem determinar se é política desejada.

### Supabase

- SQL do projeto vinculado foi acessível e permitiu auditoria/aplicação controlada.
- 66/66 tabelas públicas com RLS.
- Cinco migrations P11 aplicadas; migration da IA pendente.
- Drift histórico anterior a julho permanece e não foi “reparado” cegamente.
- Management API/Auth/backups/configuração de senhas vazadas continuam sem permissão.

## Evidência de testes

| Comando/ensaio | Resultado |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `bun test src` | 136 PASS, 0 FAIL |
| `npm run test:components` | 9 PASS |
| `npm run build` | PASS |
| `npm run test:pwa` | PASS |
| `npm run test:e2e` | 15 PASS |
| `npm run test:pwa:e2e` | 3 PASS |
| SQL attack matrix | 29 PASS, 0 FAIL, rollback |
| `supabase db lint --linked` | 1 warning legado, 0 erro |
| Varredura do `dist` | Nenhum secret de alto risco encontrado |
| E2E em produção | BLOQUEADO — NÃO VALIDADO |
| Smoke test de produção | BLOQUEADO — NÃO VALIDADO |

## Pendências e dívidas técnicas

1. Recuperar controle do GitHub e Vercel; publicar um preview imutável.
2. Configurar envs backend por ambiente, aplicar a boundary da IA no rollout e testar rollback.
3. Executar E2E autenticado Admin/Gestor/Membro/Viewer em dois workspaces e o roteiro de smoke de 21 passos.
4. Confirmar backup/PITR, retenção, RPO/RTO e restore isolado.
5. Habilitar proteção contra senha vazada após avaliar impacto de Auth.
6. Resolver drift histórico por comparação de conteúdo, não por `repair` em massa.
7. Testar signed URLs, versões, MIME/path traversal e expiração via HTTP real.
8. Executar concorrência real de CRM/templates/documentos/relatórios/tarefas.
9. Executar longa duração, multiaba, throttling de rede e atualização entre deployments.
10. Planejar React Router 7 e reduzir chunks pesados sem misturar com release de hardening.

## Critério de release

Segurança de banco, automação server-side, cache PWA, suítes locais, health e rollback documentado foram substancialmente aprovados. Porém os itens de **produção**, **deployment**, **E2E final**, **backup** e **rollout da auditoria IA** continuam abertos.

# NO-GO

Bloqueadores formais:

1. **Git remoto não é fonte recuperável:** P4–P11 ainda não estão confirmados no GitHub oficial.
2. **Deployment final não está sob controle:** não há publicação, proteção, envs ou rollback validados.
3. **Produção não foi testada:** login, E2E autenticado, IA real e smoke test não foram executados no domínio final.
4. **Boundary da auditoria IA está incompleta no ambiente real:** aplicar sem o secret/API coordenados causaria indisponibilidade.
5. **Recuperação de dados não foi comprovada:** backup/PITR/restore continuam desconhecidos.

O P11 técnico está preparado para revisão humana, mas não deve ser marcado como release concluído nem iniciar a P12 até esses bloqueadores serem resolvidos e revalidados.
