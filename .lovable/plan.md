
# Evolução do Plano de Ação — Workspace de Tarefas

Antes de escrever código, deixo aqui o plano técnico para sua aprovação. É uma entrega grande, então proponho quebrar em fases para que você valide cada etapa.

## Diagnóstico do estado atual

- `tasks` (Supabase) já existe com: `id, title, description, client_id, project_id, responsible (texto), priority, status, due_date, type`, campos 5W2H, `evidence_*`. RLS por autenticado.
- Não existe `assigned_to` (uuid), `created_by`, `start_date`, `completed_at`, `task_type` pessoal/projeto, `source_meeting_id`, checklist, colaboradores, anexos, etiquetas, histórico, menções, recorrência.
- `task_comments` já existe. `profiles`, `user_roles` (admin/moderator/user) e `has_role()` já existem. `meetings` existe.
- Frontend: `PlanoAcao.tsx` com Kanban 5 colunas, filtros básicos, drag&drop; `TaskCard`, `TaskDialog`, `TaskComments`. Sem calendário, sem workspace pessoal, sem visão de equipe.
- `Dashboard` já tem `TaskQueue` (fila do dia) mas simples.

## Escopo dividido em fases

Proponho entregar em **3 PRs incrementais** (para manter revisões gerenciáveis). Nesta interação, executo a Fase 1 completa + Fase 2 parcial. Se preferir tudo de uma vez, sigo — só aviso que será uma mudança grande.

### Fase 1 — Modelo de dados + permissões (migration)

Alterar `tasks` (aditivo, não quebrando dados existentes):
- `task_type` text ('personal' | 'project') default 'project'
- `created_by` uuid → auth.users
- `assigned_to` uuid → auth.users (paralelo ao `responsible` texto legado; migração popula a partir de `profiles.full_name` quando possível)
- `start_date` date, `completed_at` timestamptz
- `source_type` text ('manual' | 'meeting' | 'diagnostic' | 'recurring')
- `source_meeting_id` uuid → meetings
- `consulting_cycle_id` uuid, `planned_week` text
- `recurrence_rule` jsonb, `labels` text[]
- Colunas Kanban ampliadas: adicionar 'waiting' (Aguardando) e 'review' (Em revisão). Compat: 'validation' → 'review' via view/migração.

Novas tabelas:
- `task_collaborators (task_id, user_id, added_at)` PK composta
- `task_checklist_items (id, task_id, title, done, position, created_at)`
- `task_attachments (id, task_id, path, filename, mime, size, uploaded_by, uploaded_at)`
- `task_activity_log (id, task_id, user_id, action, from_value, to_value, created_at)`
- `task_mentions (id, task_id, comment_id, mentioned_user, created_at)`

Grants + RLS em todas. Função `public.can_view_task(task_id, user_id)`:
- criador OU assigned_to OU colaborador OU admin OU (task de projeto e usuário participa do projeto — usando `projects.responsibleUserId` inicialmente; grupo de projeto pode ser expandido depois).
- Admin = `has_role(uid,'admin')`. Gestor = `has_role(uid,'moderator')` sobre projetos que responde.

Trigger `tasks_activity_log_trg` grava mudanças de status/prioridade/assigned/completed.
Trigger de `completed_at` ao entrar em 'done' (e limpar ao sair).

### Fase 2 — Backend TS + Contextos

- `src/integrations/supabase/tasks.ts`: expandir com listagem por escopo (mine / project / team), checklist, attachments, activity, collaborators.
- `DataContext`: expor `myTasks`, filtros server-side helpers.
- Hook novo `useTaskPermissions()` para gates de UI.
- Utilitário `isOverdue(task)` (due_date < hoje e status ≠ 'done').

### Fase 3 — UI Plano de Ação

- Tabs no topo: **Meu Workspace | Por Projeto | Visão da Equipe** (última só admin/gestor).
- Toggle de visualização: **Kanban | Lista | Calendário** (react-day-picker já disponível). Kanban default.
- Colunas: Backlog, Próximas, Em andamento, Aguardando, Em revisão, Concluídas.
- `TaskCard` atualizado: badges de checklist (x/y), comentários, anexo, atraso, prioridade Baixa/Normal/Alta/Urgente.
- `TaskDialog` reformulado como painel lateral (Sheet) com abas: Detalhes, Checklist, Comentários, Anexos, Histórico. Campo tipo (pessoal/projeto); ao trocar projeto, preenche cliente.
- Filtros ampliados (cliente, projeto, responsável, status, prioridade, prazo, atrasadas, tipo, etiquetas, busca por título/descrição, limpar tudo).
- Feedback: loading skeletons, toasts de sucesso/erro no drag, estados vazios.

### Fase 4 — Integrações

- `ProjetoDetalhes`: seção "Plano de Ação" já existe parcialmente; garantir "Nova tarefa" com projeto/cliente pré-preenchido, filtrada por `project_id`.
- `Reunioes` / `MeetingMinutesDialog`: ação "Criar tarefa a partir deste ponto" gravando `source_type='meeting'` e `source_meeting_id`.
- `Dashboard` → `TaskQueue`: reescrever para mostrar: atrasadas do usuário, vencem hoje, urgentes, em andamento, reuniões do dia; abrir tarefa via link.

### Fase 5 — Notificações (estrutura)

- Reusar tabela `notification_preferences` e edge function `notify-task-comment`.
- Adicionar eventos: atribuição, mudança de status, prazo próximo (deixado como cron/edge stub), menção. Emissão in-app via `sonner` e registro em `task_activity_log`.

## Detalhes técnicos importantes

- Não duplicar tarefas — a mesma linha aparece em Meu Workspace, Projeto e Equipe via filtros diferentes.
- Compat: manter coluna `responsible` (texto) para dados legados; nova UI escreve `assigned_to` + espelha nome no `responsible` para não quebrar leituras existentes.
- Compat de status: converter tarefas com status `validation` para `review` na migração.
- RLS de leitura via função SECURITY DEFINER para evitar recursão. Escritas: apenas criador/assigned/admin/gestor de projeto.
- Anexos no bucket `documents` já existente, pasta `tasks/<task_id>/`.

## Riscos / limitações

- Recorrência: modelo salvo, mas geração automática de próximas ocorrências fica como edge function stub (implementação real futura).
- Calendário: uso do `Calendar` existente com marcadores; não é um calendário estilo Google, é um mês com dots + lista.
- "Visão da Equipe" restrita a admin/moderator; papel "gestor de projeto" mapeado a `moderator`.
- Notificações por e-mail/push: apenas estrutura + comentário (já implementado). Demais eventos ficam como hooks preparados.

## Como quer que eu prossiga?

1. **Executar tudo agora** (fases 1–5) em sequência, começando pela migration. Vai ser uma mudança extensa em um único ciclo.
2. **Ir por fases** — começo pela Fase 1 (migration) agora e você aprova cada próxima fase.

Me confirma a opção (1 ou 2) que sigo imediatamente.
