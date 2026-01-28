
# Plano: Página de Detalhes do Projeto (ProjetoDetalhes)

## Visão Geral

Criar uma nova página dedicada para visualizar os detalhes de um projeto específico, mostrando um resumo completo com tarefas, progresso, diagnósticos, reuniões e oportunidades relacionadas.

---

## Arquitetura da Solução

### Nova Rota
- **URL**: `/projetos/:id`
- **Componente**: `src/pages/ProjetoDetalhes.tsx`

### Estrutura Visual Proposta

```text
+----------------------------------------------------------+
|  <- Voltar    [Nome do Projeto]           [Editar] [Jornada]
|               Cliente: Nome do Cliente    Badge: Fase atual
+----------------------------------------------------------+
|                                                           |
|  +-------------------+  +-------------------------------+ |
|  | CARD PROGRESSO    |  | CARD STATUS E DATAS           | |
|  | - Barra visual    |  | - Semáforo (green/yellow/red) | |
|  | - % calculado     |  | - Data início / previsão fim  | |
|  | - Fonte: auto/man |  | - Responsável com avatar      | |
|  +-------------------+  +-------------------------------+ |
|                                                           |
|  +------------------------------------------------------+ |
|  | RESUMO DE TAREFAS (mini-kanban ou lista)             | |
|  | - Backlog: 4  | Próximas: 2 | Em andamento: 1 | ...  | |
|  | - Lista das últimas 5 tarefas com status             | |
|  | - Botão: Ver todas no Plano de Ação                  | |
|  +------------------------------------------------------+ |
|                                                           |
|  +------------------------+  +--------------------------+ |
|  | DIAGNÓSTICOS           |  | REUNIÕES                 | |
|  | - Lista vinculados     |  | - Próximas agendadas     | |
|  | - Status de cada um    |  | - Link para detalhes     | |
|  | - Botão: Novo diag.    |  | - Botão: Agendar reunião | |
|  +------------------------+  +--------------------------+ |
|                                                           |
|  +------------------------------------------------------+ |
|  | OPORTUNIDADES (Dinheiro na Mesa)                     | |
|  | - Lista de oportunidades vinculadas                  | |
|  | - Valor total estimado                               | |
|  | - Status de cada uma                                 | |
|  +------------------------------------------------------+ |
|                                                           |
|  +------------------------------------------------------+ |
|  | ENTREGÁVEIS DO PROJETO                               | |
|  | - Checklist visual                                   | |
|  | - % concluídos                                       | |
|  +------------------------------------------------------+ |
+----------------------------------------------------------+
```

---

## Componentes a Criar

### 1. `src/pages/ProjetoDetalhes.tsx` (Página Principal)
- Header com navegação, nome do projeto e ações
- Grid responsivo com cards de informações
- Integração com DataContext para buscar dados relacionados

### 2. `src/components/projetos/ProjectTasksSummary.tsx`
- Mini resumo das tarefas por status (contadores)
- Lista das 5 tarefas mais recentes ou prioritárias
- Link para ver todas no Plano de Ação (filtrado)

### 3. `src/components/projetos/ProjectDiagnosticsList.tsx`
- Lista de diagnósticos vinculados ao projeto
- Status visual (draft, in_progress, completed)
- Score quando disponível
- Ação rápida para criar novo diagnóstico

### 4. `src/components/projetos/ProjectMeetingsList.tsx`
- Próximas reuniões agendadas
- Reuniões recentes realizadas
- Link para agendar nova reunião

### 5. `src/components/projetos/ProjectOpportunitiesList.tsx`
- Lista de oportunidades de "dinheiro na mesa"
- Valor total estimado
- Status de cada oportunidade

### 6. `src/components/projetos/ProjectDeliverablesList.tsx`
- Checklist visual de entregáveis
- Progresso por status (pendente, em andamento, concluído)

### 7. `src/components/projetos/index.ts`
- Barrel export dos componentes

---

## Modificações em Arquivos Existentes

### `src/App.tsx`
- Adicionar rota: `/projetos/:id` -> `ProjetoDetalhes`

### `src/pages/Projetos.tsx`
- Tornar os cards clicáveis com navegação para `/projetos/:id`
- Adicionar `cursor-pointer` e `onClick={() => navigate(...) }`

---

## Dados Exibidos

### Card de Progresso
- Barra de progresso visual
- Porcentagem (calculada automaticamente ou manual)
- Indicador se é automático ou sobrescrito
- Tooltip explicando o cálculo

### Card de Status
- Semáforo visual (verde/amarelo/vermelho)
- Razão do status atual
- Datas: início, previsão de término, prazo original
- Badge de "Atrasado" se aplicável
- Avatar e nome do responsável

### Resumo de Tarefas
- Contadores por coluna (Backlog, Próximas, Em Andamento, Validação, Concluídas)
- Mini-cards das 5 tarefas mais prioritárias
- Botão "Ver todas" que navega para `/plano-acao?projectId=xxx`

### Diagnósticos
- Cards resumidos com:
  - Nome e template
  - Status (badge colorido)
  - Score (se concluído)
  - Data de atualização
- Botão "Novo Diagnóstico" abre DiagnosticDialog

### Reuniões
- Lista de próximas reuniões (data, título, status)
- Link para detalhes
- Botão "Agendar Reunião" abre MeetingDialog

### Oportunidades
- Tabela ou lista de oportunidades
- Tipo, descrição, valor estimado, status
- Total consolidado

### Entregáveis
- Checklist visual com checkbox (read-only)
- Contagem: "3 de 5 concluídos"

---

## Funcionalidades Extras Sugeridas

1. **Navegação Contextual**
   - Breadcrumb: Projetos > [Nome do Cliente] > [Nome do Projeto]
   - Botão "Ver Jornada do Cliente"

2. **Ações Rápidas**
   - Editar projeto (abre ProjectDialog)
   - Criar tarefa (abre TaskDialog com project pré-selecionado)
   - Criar diagnóstico
   - Agendar reunião

3. **Histórico de Atividades** (opcional, fase 2)
   - Timeline de eventos recentes do projeto
   - Baseado em `project_audit_logs` ou `client_journey_events`

4. **Indicadores do Projeto** (opcional)
   - Mini dashboard com indicadores vinculados
   - Link para página de Indicadores filtrada

---

## Detalhes Técnicos

### Hooks e Contextos
- Usa `useData()` para acessar: projects, tasks, diagnostics, meetings, opportunities, deliverables
- Filtra por `projectId` usando `useMemo`

### Navegação
- `useParams<{ id: string }>()` para obter ID do projeto
- `useNavigate()` para navegação programática

### Componentes de UI
- Cards do shadcn/ui
- Progress, Badge, Avatar, Tooltip
- Tabs para organizar seções (opcional)

---

## Ordem de Implementação

1. Criar `src/pages/ProjetoDetalhes.tsx` com layout base
2. Adicionar rota no `App.tsx`
3. Modificar `Projetos.tsx` para cards clicáveis
4. Criar componente `ProjectTasksSummary`
5. Criar componente `ProjectDiagnosticsList`
6. Criar componente `ProjectMeetingsList`
7. Criar componente `ProjectOpportunitiesList`
8. Criar componente `ProjectDeliverablesList`
9. Criar barrel export `index.ts`
10. Testes e ajustes finais

---

## Resultado Esperado

Ao clicar em qualquer projeto na lista, o usuário será levado a uma página completa que mostra:
- Visão 360° do projeto
- Progresso real baseado em tarefas
- Acesso rápido a todas as entidades relacionadas
- Ações contextuais para gerenciar o projeto

Esta página será similar em estrutura à `ClienteDetalhes.tsx`, mantendo consistência visual e de UX com o restante da plataforma.
