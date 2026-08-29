# Relatório de auditoria — JoIA Ops

Data: 21/07/2026
Escopo: código React/TypeScript, rotas, autenticação, Supabase/RLS, build, lint, testes, botões de entrada, estados vazios, detalhes, responsividade e console do navegador.

## Resumo executivo

O app compila e os 35 testes existentes passam, mas não está pronto para produção. Foram confirmados 4 problemas críticos, 8 de alta prioridade, 12 de prioridade média e diversos problemas menores. Os maiores riscos são acesso indevido aos dados por qualquer conta autenticada, telas brancas em fluxos centrais, ausência de Error Boundary e controles visíveis que não executam nenhuma ação.

## Críticos

### C1 — Qualquer usuário autenticado acessa e pode alterar dados corporativos

- Evidência funcional: a conta nova `Codex Auditoria E2E`, sem papel administrativo e sem associação a projeto, visualizou clientes, equipe, reunião e resumo financeiro existentes.
- Evidência no banco: `supabase/migrations/20251218020509_cff4b7ac-8f9f-4d9a-80f9-8b88e30eb850.sql:304-376` usa `USING (true)` e `WITH CHECK (true)` para clientes, reuniões, colaboradores, leads, diagnósticos, indicadores, documentos, playbooks e financeiro.
- Impacto: vazamento e alteração indevida de dados; BOLA/IDOR entre usuários; exposição financeira e de contatos.
- Correção: substituir políticas globais por ownership/membership e papéis armazenados em `app_metadata` ou tabela protegida. Revisar também tabelas adicionadas posteriormente.

### C2 — “Novo Indicador” derruba toda a aplicação

- Reprodução: Indicadores → Novo Indicador.
- Resultado: DOM fica vazio/tela branca.
- Console: `A <Select.Item /> must have a value prop that is not an empty string`.
- Causa: `src/components/dialogs/IndicatorDialog.tsx:197` contém `<SelectItem value="">Nenhum</SelectItem>`.
- Impacto: criação e edição de indicadores ficam indisponíveis e toda a sessão visual quebra.

### C3 — Jornada do Cliente gera tela branca

- Reprodução: abrir `/clientes/404daaf7-fb34-4f16-9397-4f4a47e2f2f4/jornada` diretamente.
- Console: `Rendered more hooks than during the previous render`.
- Causa: `src/pages/ClienteJornada.tsx:37-47` chama `useJourneyActionHandler` condicionalmente quando `client` existe.
- Impacto: rota central de jornada fica inutilizável conforme a ordem de carregamento dos dados.

### C4 — Autorização de templates usa metadado editável pelo usuário

- Arquivos: `src/pages/templates/TemplatesList.tsx:23-25`, `TemplateCreate.tsx:18`, `TemplateEdit.tsx:22`, `TemplatePreview.tsx:75`, `TemplateDiagnosticPreview.tsx:173` e `TemplateBuilder.tsx:164`.
- Problema: decisões de papel usam `user.user_metadata.role`; esse metadado é controlável pelo próprio usuário no Supabase.
- Agravante: usuário sem papel é tratado como não analista e recebe criação/edição/duplicação; apenas arquivamento é restringido.
- Impacto: elevação de privilégio no frontend, combinada com RLS ampla nas tabelas de templates.

## Alta prioridade

### A1 — Filtros de Diagnóstico também usam valores vazios incompatíveis com Radix

- `src/pages/Diagnostico.tsx:62,78,94,108` possui `<SelectItem value="">Todos</SelectItem>`.
- Ao montar esses conteúdos, o mesmo erro fatal observado em Indicadores pode ocorrer.

### A2 — Não existe Error Boundary

- Um erro em IndicatorDialog ou ClienteJornada apaga toda a aplicação.
- `src/App.tsx` não envolve as rotas em Error Boundary.
- Deve haver fallback recuperável, registro do erro e opção de retornar/recarregar.

### A3 — Oito módulos quebram horizontalmente no celular

Teste em viewport de 375 px (largura útil observada: 360 px):

| Rota | largura renderizada | resultado |
|---|---:|---|
| Clientes | 662 px | overflow grave |
| Plano de Ação | 524 px | overflow grave |
| Reuniões | 566 px | overflow grave |
| Playbooks | 404 px | overflow |
| Equipe | 369 px | overflow |
| Financeiro | 912 px | overflow extremo |
| Marketing | 363 px | overflow |
| Configurações | 646 px | overflow grave |

Principais causas: cabeçalhos `flex` sem quebra, tabs com largura intrínseca e cards/tabelas herdando largura de desktop.

### A4 — Botões principais sem implementação

- Busca global: `src/components/layout/TopBar.tsx:30-35` não tem estado, `onChange` ou submit.
- Ações rápidas: `TopBar.tsx:48-52` abre itens sem `onClick`.
- Notificações: `TopBar.tsx:56-61` mostra contador fixo “3” e não abre nada.
- Filtros de Projetos: `src/pages/Projetos.tsx:43` não possui handler.
- Importar Indicadores: `src/pages/Indicadores.tsx:140-143` não possui handler.
- Salvar workspace: `src/pages/Configuracoes.tsx:58-60` não possui handler.
- Sidebar compacta: `Configuracoes.tsx:120` é um switch sem estado/handler.

### A5 — Funções apresentadas como reais ainda são mocks

- `src/components/diagnostico/CardDiagnostico.tsx:92`: “Exportar PDF” apenas chama `alert("PDF exportado (mock)")`.
- `CardDiagnostico.tsx:94`: “Gerar oportunidades” apenas exibe alert.
- Isso induz o usuário a acreditar que uma operação foi concluída.

### A6 — Exclusões otimistas podem sumir da UI mesmo quando falham no banco

- `src/contexts/DataContext.tsx:2840-2841`, `2896-2897`, `3343-3344` e `3485-3486` removem primeiro do estado e apenas registram erro da API no console.
- Não há rollback nem feedback ao usuário.
- Impacto: divergência entre interface e banco; item reaparece no refresh.

### A7 — Várias entidades são somente locais ou têm persistência inconsistente

- `DataContext.tsx:2846-2849`: reuniões são adicionadas/editadas/excluídas apenas no estado local nesse bloco.
- `DataContext.tsx:2902-2908`: documentos possuem operações locais fora do fluxo de upload.
- Revisar duplicidade entre hooks específicos e o DataContext para evitar fontes de verdade concorrentes.

### A8 — Configurações de usuários e segurança são placeholders

- `src/pages/Configuracoes.tsx:65-99` informa que backend/autenticação ainda precisam ser habilitados, embora o app já tenha autenticação.
- As tabs existem, mas não oferecem gerenciamento real.

## Prioridade média

1. `npm run lint` falha com 54 erros e 10 warnings; destaque para Hook condicional, 52 ocorrências de `any`, bloco vazio e `@ts-nocheck`.
2. `tsc --noEmit` falha porque `bun:test` e o global `Bun` não têm tipos configurados (`@types/bun` ausente ou testes não separados do tsconfig da aplicação).
3. Bundle inicial de produção: 1.797,95 kB minificado, 487,81 kB gzip; não há code splitting por rota.
4. `caniuse-lite` está 13 meses desatualizado.
5. `<title>` permanece “Lovable App” e `index.html` ainda contém TODO para nome do produto.
6. A página 404 mistura inglês (“Oops! Page not found”, “Return to Home”) em app português.
7. `NotFound.tsx:8` registra navegação normal para 404 como `console.error`, poluindo observabilidade.
8. React Router emite dois warnings de migração v7 em cada carregamento.
9. `TaskComments.tsx:56` possui dependência ausente no `useEffect`, com risco de closure obsoleta.
10. Falhas de leitura em vários recursos são apenas enviadas ao console; faltam estados de erro consistentes para o usuário.
11. Formulários de autenticação não usam `required`, `autocomplete`, `aria-invalid` nem mensagens associadas aos campos; a validação depende de toast global.
12. Não há testes automatizados de componentes, rotas, autenticação, responsividade ou E2E. Os 35 testes cobrem somente funções de domínio/migrations.

## Segurança adicional

- Storage de documentos permite operações a qualquer usuário autenticado no bucket segundo `20251227064939_9e61b637-f1c5-42c5-b606-9f0608746961.sql`; falta escopo por pasta/cliente/projeto.
- Tabelas de templates, histórico de indicadores, despesas e jornada possuem políticas globais `USING (true)`/`WITH CHECK (true)` em migrations próprias.
- A Edge Function `notify-task-comment` usa service role e registra destinatários/endpoints em logs; reduzir dados pessoais em log e validar rigorosamente o JWT/autor da chamada.
- Não foi possível executar os Security/Performance Advisors do projeto porque a conexão Supabase disponível não concedeu permissão para essa ação. A revisão local das migrations, porém, confirmou as políticas inseguras.

## O que passou

- `npm run build`: sucesso.
- `npm test`: 35 testes passaram, 0 falharam.
- `npm audit --omit=dev`: 0 vulnerabilidades conhecidas em dependências de produção.
- Login, confirmação de e-mail e logout básico funcionam.
- Todas as 15 rotas principais carregam no desktop antes de interações fatais.
- Auth não apresentou overflow horizontal em 320, 375, 768 e 1440 px.
- Estados de ID inexistente funcionam em Cliente, Diagnóstico e Template.
- Os diálogos de Cliente, Projeto, Diagnóstico, Tarefa, Reunião, Upload, Playbook, Colaborador, Receita e Lead abrem.

## Ordem recomendada de correção

1. Bloquear imediatamente o acesso global do RLS e revisar papéis.
2. Corrigir todos os `SelectItem value=""` e o Hook condicional.
3. Adicionar Error Boundary.
4. Remover/ocultar botões sem implementação e mocks, ou implementar os fluxos.
5. Corrigir responsividade, começando por Financeiro, Clientes e Configurações.
6. Corrigir persistência otimista e unificar fontes de dados.
7. Fazer lint e TypeScript passarem no CI.
8. Adicionar testes E2E para cada rota e CRUD crítico.
9. Dividir bundle por rota e finalizar metadados/404.

## Observação sobre dados de auditoria

- Conta confirmada criada: `joia-audit-1784670424@web-library.net`.
- Uma tentativa não confirmada pode existir: `auditoria.codex.20260721.1845@example.com`.
- Nenhum cliente, projeto, indicador, lançamento financeiro ou outro registro corporativo foi criado/excluído durante esta auditoria.

---

## Remediação implementada em 21/07/2026

- Criada a migration corretiva `20260721220208_secure_workspace_authorization.sql`, sem alterar migrations históricas e sem executar comandos destrutivos.
- Adicionados `workspaces`, `workspace_members`, `user_preferences`, papéis `viewer/member/manager/admin/owner`, funções auxiliares com `SECURITY DEFINER`, `search_path` explícito e RLS separada por operação.
- O backfill legado é fail-closed: dados antigos recebem o workspace legado, mas apenas contas com papel interno confiável recebem membership. Contas sem associação não obtêm acesso automático.
- Projetos e entregáveis exigem membership do projeto; financeiro exige manager/admin/owner ou papel financeiro protegido; templates exigem manager para escrita e admin para exclusão; storage exige prefixo UUID do workspace.
- Removido o uso de `user_metadata.role`; autorização do frontend foi centralizada e o banco permanece a autoridade final.
- Corrigidos Selects com valor vazio, Hook condicional da Jornada, Error Boundary, autenticação acessível, exclusões inconsistentes, persistência de reuniões/documentos, busca global, filtros, importação CSV, configurações e PDF real de diagnóstico.
- Ações sem backend seguro foram desabilitadas e identificadas como indisponíveis, sem simular sucesso.
- Rotas passaram a usar lazy loading; o chunk inicial caiu de 1.797,95 kB (487,81 kB gzip) para 401,84 kB (108,78 kB gzip). O jsPDF ficou sob demanda.
- Responsividade validada em 320, 375, 768, 1024 e 1440 px em 15 rotas: nenhuma apresentou overflow do documento.
- Edge Function `notify-task-comment` agora valida JWT, autor, acesso por RLS, busca dados no servidor, aplica idempotência e não registra destinatários/conteúdo/tokens.

## Resultado final automatizado

- `npm run lint`: passou, 0 erros e 0 warnings.
- `npm run typecheck`: passou, 0 erros.
- `npm test`: 45 passaram, 0 falharam.
- `npm run test:components`: 8 passaram, 0 falharam.
- `npm run test:e2e`: 2 passaram, incluindo 75 verificações de rota/largura.
- `npm run build`: passou com Vite 8.1.5; chunk inicial 401,84 kB / 108,78 kB gzip.
- `npm audit --omit=dev` e `npm audit`: 0 vulnerabilidades.
- `caniuse-lite`: atualizado para 1.0.30001806.

## Pendências externas e riscos residuais

- A migration não foi aplicada ao projeto remoto, pois isso altera autorização de produção e requer janela/controladoria do proprietário. Aplicar com `npx supabase db push` após backup e revisão dos membros legados.
- `supabase db lint --local` não pôde conectar porque este ambiente não possui Postgres/Supabase local em execução. O teste transacional está em `supabase/tests/workspace_rls.sql` e deve ser executado em banco local descartável após `supabase db reset`.
- Configurar `ALLOWED_ORIGINS`, `RESEND_API_KEY`, `RESEND_FROM`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` nas Edge Functions.
- Após aplicar a migration, revisar manualmente quais contas históricas devem ser promovidas no workspace legado. O padrão intencional é negar acesso quando não houver regra confiável.
