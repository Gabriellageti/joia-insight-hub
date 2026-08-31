# P11 — Smoke final de produção

Data: 30/08/2026. **Smoke final completo NÃO EXECUTADO — BLOQUEADO — NÃO VALIDADO.**
Motivo vigente: recuperação conhecida/testável, retenção dos históricos e smoke das funcionalidades HABILITADAS ainda não comprovados. A decisão humana posterior retirou IA generativa dos pré-requisitos desta release. Não rotular testes locais/probes como smoke integral, nem reprovar o núcleo pela IA intencionalmente desligada.

Domínio oficial: `https://joia-ops-live.vercel.app`.

## Evidência parcial desta etapa

- REST real: contenção financeira aprovada com Admin/Gestor/Membro/Viewer sintéticos em workspaces separados.
- REST real: edição/exclusão de tarefa, exclusão de reunião com filhos, isolamento e preservação de activity_logs passaram; ver [contenção e auditoria](P11_FINANCIAL_AUDIT_CONTAINMENT.md).
- Health oficial HTTP200/healthy em `2026-08-30T17:02:38.355Z`, request ID `2de2d9cd-4f71-439c-9315-11dcbf6a5f5b`.
- CSP com frame-ancestors none, nosniff, Referrer-Policy e Permissions-Policy presentes no endpoint oficial.
- Candidato local: 15 E2E e 3 PWA aprovados, sem alegação de backend real nesses testes.

## Matriz completa pendente

| Etapa | Resultado | Evidência | Observação |
|---|---|---|---|
| 1. Admin/Gestor/Membro/Viewer A/B | BLOQUEADO — NÃO VALIDADO no smoke integral | Perfis sintéticos usados no teste financeiro | Falta matriz completa de todos os módulos |
| 2. Login/senha inválida/refresh/logout/expiração/multiaba | BLOQUEADO — NÃO VALIDADO | Login REST válido realizado | Não cobre todos os estados visuais |
| 3. Cliente CRUD/atividade | BLOQUEADO — NÃO VALIDADO | Fixture criada/removida por harness | Não cobre jornada UI |
| 4. Projeto/responsável/timeline | BLOQUEADO — NÃO VALIDADO | Fixture REST | Sem jornada completa |
| 5. Template/etapas/checklists/prazos/idempotência | BLOQUEADO — NÃO VALIDADO | Local e histórico anteriores | Não reexecutado real nesta etapa |
| 6. Tarefa e transições | BLOQUEADO — NÃO VALIDADO no fluxo completo | Edição/DELETE autenticado PASS | Não cobre todas as transições UI |
| 7. Kanban/refresh/outra aba | BLOQUEADO — NÃO VALIDADO | E2E local PASS | Backend simulado |
| 8. Meu Dia | BLOQUEADO — NÃO VALIDADO | E2E local PASS | Falta produção completa |
| 9. Reunião/iniciar/finalizar | BLOQUEADO — NÃO VALIDADO | DELETE com filhos real PASS | Não cobre reunião inteira |
| 10. Decisão → tarefa/origem/visibilidade | BLOQUEADO — NÃO VALIDADO | E2E local PASS | Falta produção completa |
| 11. Documentos/upload/versões/archive/restore | BLOQUEADO — NÃO VALIDADO | Evidência anterior Storage limitada | Não foram enviados arquivos nesta etapa |
| 12. Relatório/versão/imutabilidade/PDF | BLOQUEADO — NÃO VALIDADO | PDF local PASS | Falta produção completa |
| 13. IA real/fontes/sugestões/modelo hostil | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Não é PASS nem FAIL do núcleo | Não ativar billing nesta release |
| 13b. Estado desabilitado UI/API | PASS local; BLOQUEADO — NÃO VALIDADO no domínio oficial | Código novo não implantado nesta rodada | Conferir zero provedor/auditoria/gerações após implantação |
| 14. CRM/oportunidade/kanban | BLOQUEADO — NÃO VALIDADO | E2E local PASS | Não reexecutado real |
| 15. Follow-up/Meu Dia | BLOQUEADO — NÃO VALIDADO | Contrato local | Falta produção completa |
| 16. Conversão CRM | BLOQUEADO — NÃO VALIDADO nesta etapa | Concorrência real histórica | Não converter dados reais |
| 17. Automação temporal/cron/idempotência | BLOQUEADO — NÃO VALIDADO no cenário novo | Health do scheduler saudável | Health não prova efeito de cenário sintético |
| 18. Notificação interna/Realtime/leitura/link/resolução | BLOQUEADO — NÃO VALIDADO | E2E local PASS | Canal externo não configurado fora do escopo; não é FAIL |
| 19. Dashboard | BLOQUEADO — NÃO VALIDADO | Rotas locais | Falta refletir fixtures reais |
| 20. Activity Log completo | BLOQUEADO — NÃO VALIDADO no fluxo inteiro | Exclusão/isolamento/activity_logs PASS | Falta cadeia CRM/automação/documentos |
| 21. Logout/React Query/sessionStorage/SW | BLOQUEADO — NÃO VALIDADO integral | Revogação de sessões REST do teste | Falta sessão UI completa |
| 22. Troca para usuário B | BLOQUEADO — NÃO VALIDADO integral | RLS de auditoria A/B PASS | Falta cache visual entre usuários |
| 23. Offline pós-troca | BLOQUEADO — NÃO VALIDADO | PWA local PASS | Falta produção A/B |
| 24. Mobile375/desktop1440 | BLOQUEADO — NÃO VALIDADO em produção | Responsividade local aprovada | Não substitui o domínio oficial |
| 25. Console/requests/runtime | BLOQUEADO — NÃO VALIDADO no smoke completo | Testes locais e /auth sem erros | Sem captura de sessão produtiva integral |
| 26. Cleanup global | BLOQUEADO — NÃO VALIDADO | Cleanup clientes/projetos/tarefas/reunião/usuários e activity_logs PASS | Revisar outros históricos antes do teste integral |

Não foram usadas pessoas ou registros reais como fixtures. Os 25 eventos activity_logs dos três ensaios persistentes permanecem retidos; não há usuários/workspaces daqueles ensaios restantes. Nenhum expurgo de auditoria foi implementado.
