# P9 — CRM e gestão comercial

## Resultado

O JoIA Ops passou a acompanhar o relacionamento comercial desde o lead até a criação de cliente e projeto. A nova página **Comercial** reúne Kanban, dados da oportunidade, histórico, propostas, follow-ups, indicadores e conversão, respeitando o workspace e os papéis existentes.

## Auditoria do legado

- A tabela `leads` e a página antiga de Marketing já formavam um CRM embrionário, com seis estados e dados básicos.
- A tabela `opportunities` já existente representa oportunidades de melhoria encontradas em diagnósticos de consultoria. Ela não foi reutilizada para vendas, pois isso misturaria dois conceitos e quebraria rastreabilidade.
- `leads` foi evoluída como fonte única do funil comercial.
- O cadastro de clientes, o cadastro de projetos e os modelos de projeto do P5 foram reutilizados no fluxo de conversão.
- O componente legado de Marketing foi preservado e recebeu normalização de compatibilidade para os novos nomes de etapa.

## Alterações funcionais

- Criada a rota protegida `/comercial`, carregada sob demanda e adicionada à navegação operacional.
- Criado Kanban horizontal responsivo com as etapas padrão:
  - Novo Lead;
  - Primeiro Contato;
  - Qualificação;
  - Reunião;
  - Proposta;
  - Negociação;
  - Ganho;
  - Perdido.
- Cadastro completo da oportunidade: empresa, contato, telefone, e-mail, origem, responsável, serviço, valor, probabilidade, etapa, próxima ação, próximo contato, previsão de fechamento, observações e motivo de perda.
- Mudança de etapa pelo próprio cartão e edição detalhada; oportunidades perdidas exigem motivo.
- Histórico comercial com ligações, mensagens, reuniões, propostas, observações, follow-ups, conversões e mudanças de etapa.
- Propostas com valor, escopo, data, validade e os seis status solicitados, incluindo atualização posterior do status.
- Follow-up com ação, data/hora e responsável. Existe apenas um próximo contato aberto por oportunidade; reagendar atualiza o registro existente.
- Follow-ups aparecem no Comercial e no **Meu Dia** do responsável, funcionando como sua agenda operacional.
- Conversão disponível somente para oportunidade ganha.
- Verificação de possível duplicidade por empresa, e-mail ou telefone antes da criação de cliente.
- Possibilidade explícita de vincular um cliente existente ou criar um novo cliente.
- Após a conversão, o `ProjectDialog` é aberto pré-preenchido e mantém a escolha de modelos do P5 para gerar a estrutura do projeto.
- Projeto e cliente convertidos permanecem vinculados à oportunidade.

## Indicadores comerciais

Foram mantidos somente indicadores operacionais úteis:

- oportunidades abertas;
- valor em pipeline;
- propostas abertas;
- ganhos;
- perdidos;
- taxa de conversão sobre decisões;
- distribuição por origem dos leads.

Os cálculos possuem teste unitário independente.

## Banco de dados e migrations

### `20260829100000_p9_commercial_crm.sql`

- Evolução de `leads` com serviço, probabilidade, etapa, responsável, previsão, motivo de perda, timestamps de ganho/perda e vínculos de conversão.
- Backfill dos estados legados para as oito etapas comerciais.
- Criação de `commercial_activities` como timeline auditável.
- Criação de `commercial_proposals` com regras de valor, validade e status.
- Criação de `commercial_follow_ups` com responsável, prazo e conclusão auditada.
- Índices específicos para pipeline, propostas abertas, timeline e agenda do responsável.
- Trigger de histórico para criação e mudança de etapa.
- Trigger de histórico de propostas.
- Proteção de propriedade dos follow-ups.
- RPC idempotente `schedule_commercial_follow_up`.
- RPC RLS-aware `find_lead_client_duplicates`.
- RPC protegida `convert_lead_to_client`, que exige etapa ganha e confirmação explícita.

### `20260829100500_p9_customizable_pipeline_stages.sql`

- Criação de `commercial_pipeline_stages` por workspace.
- Cadastro das oito etapas padrão com ordem, probabilidade e semântica terminal.
- Substituição do `CHECK` fixo por chave estrangeira composta entre workspace e etapa.
- Preparação para futura personalização de rótulos, ordem, probabilidades e novas etapas.

As duas migrations foram simuladas isoladamente, aplicadas e confirmadas no projeto Supabase vinculado. O procedimento temporário garantiu que nenhuma migration histórica divergente fosse incluída.

## RLS e autorização

- Membros do workspace podem consultar o CRM.
- Gestores podem criar e atualizar oportunidades, atividades, propostas, follow-ups e etapas configuráveis.
- Administradores podem excluir os registros comerciais aplicáveis.
- Follow-ups são visíveis ao responsável e aos gestores; o responsável pode concluir o próprio item.
- Toda associação de responsável é validada contra membership do mesmo workspace.
- Conversão e agendamento usam `SECURITY DEFINER` somente após revalidar autenticação, workspace e papel.
- RPCs e tabelas novas tiveram acesso anônimo explicitamente revogado.
- O navegador não utiliza `SERVICE_ROLE_KEY`.
- O carregamento de colaboradores passou a seguir o RLS de membership, em vez de depender do papel legado `admin_joia`.

## Arquivos e áreas principais

- `src/pages/Commercial.tsx`
- `src/components/commercial/CommercialLeadDialog.tsx`
- `src/components/commercial/CommercialDetailsDialog.tsx`
- `src/integrations/supabase/commercial.ts`
- `src/lib/commercial/commercial.ts`
- `src/pages/MeuDia.tsx`
- `src/contexts/DataContext.tsx`
- `src/App.tsx`
- `src/components/layout/AppSidebar.tsx`
- `supabase/migrations/20260829100000_p9_commercial_crm.sql`
- `supabase/migrations/20260829100500_p9_customizable_pipeline_stages.sql`

## Testes e validações

- `npm run check`: aprovado.
  - ESLint: aprovado.
  - TypeScript: aprovado.
  - Testes unitários: **129 aprovados, 0 falhas**.
  - Testes de componentes: **9 aprovados, 0 falhas**.
  - Build de produção: aprovado.
  - PWA: manifesto, ícones e service worker aprovados.
- Playwright específico do P9: **2 aprovados**, cobrindo Kanban, histórico, propostas, follow-up, formulário completo e viewport mobile.
- Regressão Playwright sequencial completa: **14 aprovados, 0 falhas**.
- Auditoria de rotas: **21 rotas principais** sem tela branca, erro de console ou overflow.
- `supabase db lint`: nenhuma ocorrência do P9; permanece somente um aviso legado de variável sombreada em `create_financial_recurring_expense`.
- Histórico remoto confirma `20260829100000` e `20260829100500` aplicadas.
- Verificação anônima confirmou bloqueio das tabelas e RPCs comerciais.
- `git diff --check`: aprovado.
- Criado `supabase/tests/p9_runtime_verification.sql` com cenário autenticado e transacional para histórico, proposta, idempotência, conclusão, duplicidade e conversão.

## Ocorrências e decisões técnicas

- O conector Supabase disponível permitiu consulta de metadados, mas negou DDL, advisors e execução SQL. As migrations foram aplicadas pelo CLI em uma árvore temporária contendo somente o histórico remoto e os dois arquivos P9; cada aplicação foi precedida de `--dry-run`.
- Pelo mesmo limite de permissão, o arquivo SQL transacional de runtime não pôde ser disparado diretamente pelo conector. As mesmas regras foram cobertas por testes de migration, E2E e aplicação real das constraints/triggers; o script permanece pronto para execução quando a credencial SQL estiver disponível.
- A sincronização alternada de npm e Bun removeu uma dependência transitiva do PostCSS na instalação local. `npm install`, usando o lock oficial da aplicação, restaurou a árvore; a bateria completa passou depois da correção.
- A geração global de tipos Supabase não foi refeita porque o arquivo gerado contém compatibilidades manuais de diagnósticos legados. O P9 usa um adaptador Supabase mínimo e fortemente tipado, evitando apagar esses campos.
- O `npm audit` mantém duas ocorrências moderadas na linha 6 do React Router. A correção exige migração incompatível para a versão 7 e permanece como dívida técnica já registrada no P8.

## Dívida técnica controlada

- Criar, quando solicitado, uma tela administrativa para editar o catálogo `commercial_pipeline_stages`; o schema já suporta essa evolução.
- Executar o script SQL autenticado do P9 quando houver credencial de consulta direta ou permissão equivalente no conector.
- Migrar React Router 6 para 7 em ciclo próprio de regressão.

## Próximo passo

Iniciar o P10 — motor de automações e integrações — somente após o commit desta entrega e deste relatório.
