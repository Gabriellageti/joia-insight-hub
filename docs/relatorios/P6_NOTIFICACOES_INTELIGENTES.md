# P6 — Notificações Inteligentes

Data de conclusão: 29/08/2026

## O que foi criado

- Classificação de notificações em Informação, Atenção, Importante e Urgente.
- Ações internas seguras para abrir tarefa, reunião, projeto ou cliente relacionado.
- Alertas para menções nominais em comentários.
- Sinais calculados para reuniões próximas, reuniões não finalizadas, projetos em risco e clientes em atenção.
- Preferências por categoria: tarefas, projetos, reuniões, clientes e menções.
- Resolução automática de condições que deixaram de existir.
- Preparação de canais para e-mail, WhatsApp e push sem ativar comunicação externa.

## O que foi alterado

- A tabela existente `internal_notifications` foi evoluída; nenhuma central paralela foi criada.
- A central no header agora oferece as visões Novas, Lidas e Todas.
- Alertas têm prioridade visual e botão `Abrir`.
- A consulta passou a limitar 50 alertas ativos e a ignorar sinais resolvidos.
- Atualizações chegam por Realtime, com reconciliação no foco e a cada cinco minutos.
- O callback Realtime apenas relê os dados; não recalcula condições, evitando ciclos de atualização.
- A deduplicação preserva o estado lido enquanto a mesma condição continua ativa e só reabre quando ela desaparece e volta a ocorrer.
- As preferências antigas foram ampliadas e a tela foi alinhada às categorias do P6.

## Migrations

- `20260829070000_p6_intelligent_notifications.sql`: evolução da fonte existente, preferências, prioridades, ações, gatilhos e reconciliação.
- `20260829070500_p6_meeting_statuses.sql`: alinhamento da reconciliação aos status reais `Agendada`, `Em andamento`, `Realizada` e `Cancelada`.

Ambas foram aplicadas ao projeto Supabase conectado e registradas no histórico remoto.

## Novas tabelas

- Nenhuma. Foram reutilizadas `internal_notifications` e `notification_preferences`.

## Componentes

- Evolução de `NotificationCenter`.
- Evolução de `NotificationSettings`.
- Evolução dos hooks `useNotifications` e `useNotificationPreferences`.

## Rotas

- Nenhuma rota nova.
- A central permanece no header de todas as rotas protegidas.
- Preferências permanecem em `Configurações → Notificações`.

## Políticas RLS

- As duas políticas existentes de `internal_notifications` foram preservadas: leitura e atualização somente pelo destinatário.
- As três políticas existentes de `notification_preferences` foram preservadas: leitura, criação e atualização pelo próprio usuário.
- Conteúdo, prioridade, vínculos, ação e resolução são imutáveis para o navegador; somente `read_at` pode ser alterado pelo destinatário.
- Funções privadas de geração não têm execução concedida aos papéis do navegador.
- A reconciliação pública exige usuário autenticado e workspace ativo e só gera dados para o próprio usuário.

## Testes realizados

- Lint e TypeScript sem erros.
- 112 testes unitários aprovados, incluindo cinco verificações específicas do P6.
- 9 testes de componentes aprovados.
- Build de produção e verificação PWA aprovados.
- 10 testes E2E aprovados sequencialmente; um específico do P6 em viewport de 390 px.
- Teste transacional real sob RLS para atribuição urgente, comentário, menção, reunião próxima, ação, preservação do estado lido e imutabilidade do conteúdo; rollback confirmado.
- Resíduo de teste confirmado em zero.
- `supabase db lint` sem erros do P6.

## Problemas encontrados

- A base P1 já possuía uma central e gatilhos de tarefas. Eles foram evoluídos para evitar fonte duplicada.
- A primeira validação do teste consultava a notificação de outro usuário sob RLS e corretamente não a enxergou; a validação foi refeita alternando o JWT para o destinatário.
- Os status reais de reunião são em português; uma migration corretiva alinhou o cálculo e foi novamente validada.
- O advisor via conector Supabase continua indisponível por permissão da conexão. Schema, políticas, grants, triggers, índices e lint foram conferidos diretamente.
- O lint do banco repete um aviso legado em `create_financial_recurring_expense`, fora do escopo.

## Dívidas técnicas restantes

- E-mail, WhatsApp e push permanecem somente preparados, conforme solicitado.
- Menções reconhecem o formato `@Nome Completo`; um seletor de usuários com token estruturado pode melhorar a experiência futuramente.
- A reconciliação temporal ocorre enquanto o aplicativo está aberto. Execução agendada no servidor pode ser adicionada junto ao motor de automações do P10.

## Sugestões para próxima etapa

- Reaproveitar as prioridades e links acionáveis nos relatórios automáticos do P7.
- Evitar que a geração de relatórios produza vários alertas; usar uma notificação resumida por relatório concluído.
