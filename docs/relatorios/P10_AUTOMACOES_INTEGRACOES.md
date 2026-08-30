# Relatório técnico — P10 Automações e integrações

Data: 29/08/2026
Status: concluído, validado e aplicado ao Supabase vinculado

## Resultado entregue

Foi implantado um motor central de automações internas no formato **quando → condição → ação**, utilizando as entidades operacionais existentes como fonte de verdade. O P10 não criou status paralelos de tarefa, projeto, reunião ou comercial.

### Regras iniciais

1. Tarefa urgente atrasada → alerta o responsável.
2. Projeto sem atividade além de `project_stale_days` → sinaliza atenção à gestão.
3. Reunião finalizada → confirma a finalização no histórico operacional.
4. Oportunidade comercial ganha → sugere criação ou vínculo do cliente.
5. Cliente criado → sugere criação de projeto.
6. Modelo aplicado ao projeto → confirma e registra a estrutura gerada pelo P5.
7. Próximo passo atrasado → cria tarefa vinculada ao próximo passo, protegida pelo índice único já existente.
8. Tarefa bloqueada além de `blocked_stale_days` → alerta gestores.

As verificações temporais são acionadas na abertura do aplicativo, ao recuperar foco, a cada cinco minutos e manualmente pela tela de automações. Eventos transacionais são capturados imediatamente por triggers.

## Banco e segurança

Foram criadas as tabelas:

- `automation_rules`: configuração central por workspace;
- `automation_events`: fila interna com correlação, causa, profundidade e estado;
- `automation_runs`: log imutável de execução, resultado, erro e duração;
- `automation_connectors`: contratos futuros de integração, inicialmente em `planned`.

Controles aplicados:

- RLS por workspace em todas as tabelas;
- leitura de regras por membros e alteração somente por gestores;
- eventos e execuções sem permissão de escrita pelo navegador;
- funções internas revogadas de `PUBLIC`, `anon` e `authenticated`;
- RPC pública limitada a usuários autenticados com membership válida;
- chave única de idempotência por workspace;
- deduplicação de notificações por usuário/chave;
- trava transacional por workspace nas verificações periódicas;
- profundidade máxima de cinco níveis para impedir ciclos;
- erros de automação isolados do evento de negócio que os originou.

Migrações aplicadas no projeto `uopxixfgaaxsgqgrfpvx`:

- `20260829110000_p10_automation_engine.sql`;
- `20260829110500_p10_fix_event_column_scope.sql`.

A segunda migração corrige explicitamente o escopo de uma coluna detectado pelo lint PL/pgSQL e também foi incorporada à migração-base para instalações novas.

## Interface

Nova rota: `/automacoes`.

A tela inclui:

- métricas de regras ativas, execuções e erros;
- ativação/pausa de regras, limitada a gestores;
- execução manual das verificações periódicas;
- histórico com regra, entidade, horário, duração, resultado e erro;
- catálogo das integrações futuras;
- layout validado entre 320 px e 1440 px.

A central de notificações reconhece alertas, sugestões e pendências originadas pelo motor.

## Integrações futuras preparadas

Foram reservados contratos, sem qualquer conexão ou envio externo nesta fase, para:

- Google Calendar;
- Google Drive;
- Gmail;
- WhatsApp;
- Slack;
- APIs externas.

## Reuso das fontes existentes

- saúde e inatividade: `operational_project_health` e `workspace_operational_settings` do P3;
- histórico: `activity_logs` do P2;
- próximos passos: `meeting_next_steps` e vínculo `tasks.source_next_step_id` do P2;
- estrutura de projeto: `project_template_instantiations` do P5;
- alertas: `internal_notifications` do P6;
- oportunidades: `leads` e pipeline do P9.

## Validação executada

- `npm run check`: aprovado;
  - ESLint: aprovado;
  - TypeScript: aprovado;
  - 135 testes unitários: aprovados;
  - 9 testes de componentes: aprovados;
  - build de produção: aprovado;
  - manifesto, três ícones e service worker PWA: aprovados.
- Playwright completo e sequencial: **15/15 aprovado**;
  - cenário específico P10: regras, logs, integrações e execução manual;
  - auditoria responsiva: 22 rotas, larguras de 320, 375, 768, 1024 e 1440 px;
  - ausência de tela branca, erro de console e overflow.
- `supabase migration list --linked`: migrações local/remota confirmadas.
- `supabase db lint --linked --level warning`: nenhum erro ou aviso do P10; permanece apenas um aviso legado em `public.create_financial_recurring_expense`, fora do escopo.
- tipos TypeScript gerados pelo schema remoto confirmaram as quatro tabelas e a RPC do P10.

## Revisão React

Foi aplicada a checagem de boas práticas após as alterações TSX: carregamento lazy da rota, efeitos com dependências estáveis, estado otimista com rollback, controles acessíveis, feedback de carregamento e composição responsiva. Não foram identificadas pendências do P10.
