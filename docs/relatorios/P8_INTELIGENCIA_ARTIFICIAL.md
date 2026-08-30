# P8 — Inteligência Artificial aplicada

## Resultado

O JoIA Ops passou a oferecer o **Assistente JoIA**, com respostas baseadas exclusivamente nos dados que o usuário autenticado já pode consultar. O recurso fornece fontes rastreáveis, histórico por interação e sugestões de tarefas que somente são criadas após revisão humana no diálogo já existente de tarefas.

## Alterações entregues

- Criada a rota protegida `/assistente`, carregada sob demanda e disponível no menu lateral.
- Criada a interface responsiva do assistente, com perguntas rápidas, Markdown seguro, fontes navegáveis, histórico recente e links permanentes por `interactionId`.
- Adicionados atalhos contextuais em cliente, reunião e relatório de consultoria.
- Integrados componentes AI Elements para mensagens e comportamento de rolagem da conversa.
- Criada a função serverless `api/assistant.ts`, usando Vercel AI SDK, saída estruturada com Zod e o modelo `openai/gpt-5.6-luna` pelo AI Gateway.
- Configurado limite de execução de 60 segundos para a função, preservando a regra existente da SPA.
- Implementado fallback determinístico e explicitamente identificado quando o provedor de IA não está disponível; o fallback não inventa dados nem executa ações.
- Adicionado suporte de dependências para `ai`, `streamdown`, `use-stick-to-bottom` e a definição de tipos `@types/estree` exigida pela árvore de Markdown.
- Adicionada regra Git para tratar PDFs como binários e ignorado o diretório temporário de testes.

## Banco de dados e migrations

### `20260829090000_p8_ai_assistant.sql`

- Criada `ai_interactions`, com pergunta, escopo, resposta, fontes, sugestões, modelo, modo, tokens, status e timestamps.
- Criada política RLS de leitura exclusiva pelo autor da interação.
- Criados índices por usuário/workspace e data de criação.
- Criada `begin_ai_interaction`, que valida autenticação, workspace, conteúdo, escopo e aplica limite de 10 solicitações por minuto antes de persistir a auditoria pendente.
- Criada `complete_ai_interaction`, que permite finalizar somente uma interação pendente do próprio autor e limita o tamanho dos resultados persistidos.
- Criada `get_ai_context`, que monta contexto somente por consultas sujeitas ao RLS vigente e retorna identificadores, rótulos e rotas rastreáveis.

### `20260829090500_p8_revoke_ai_interaction_writes.sql`

- Revogados explicitamente `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER` da tabela para clientes autenticados.
- Mantida apenas leitura direta pelo proprietário; escritas ocorrem exclusivamente pelas funções auditadas.
- Revogado todo acesso direto do papel anônimo.

As duas migrations foram aplicadas e confirmadas no projeto Supabase vinculado.

## Segurança, privacidade e governança

- Nenhuma `SERVICE_ROLE_KEY` é usada no navegador ou na função.
- O token do usuário é validado no servidor por `auth.getUser` e reaproveitado nas RPCs, preservando RLS ponta a ponta.
- Cada geração é registrada como pendente antes da chamada ao modelo e concluída com resposta, modo e consumo de tokens.
- Texto proveniente do banco é tratado como dado, nunca como instrução ao modelo, reduzindo risco de prompt injection.
- Fontes e IDs sugeridos são filtrados no servidor contra o contexto realmente autorizado.
- A IA não cria tarefas automaticamente. A sugestão abre o `TaskDialog` preenchido e exige confirmação do usuário.
- O contexto é limitado e não inclui caminhos internos de storage nem e-mails de contato desnecessários.
- Chamadas anônimas às RPCs e escritas diretas na auditoria estão revogadas.

## Arquivos e áreas principais

- `api/assistant.ts`
- `src/pages/Assistant.tsx`
- `src/lib/ai/assistant.ts`
- `src/components/ai-elements/message.tsx`
- `src/components/ai-elements/conversation.tsx`
- `src/App.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/pages/ClienteDetalhes.tsx`
- `src/pages/ReuniaoDetalhes.tsx`
- `src/pages/ConsultingReportDetail.tsx`
- `supabase/migrations/20260829090000_p8_ai_assistant.sql`
- `supabase/migrations/20260829090500_p8_revoke_ai_interaction_writes.sql`
- `supabase/tests/p8_runtime_verification.sql`

## Testes e validações

- `npm run check`: aprovado.
  - ESLint: aprovado.
  - TypeScript da aplicação: aprovado.
  - Testes unitários: **122 aprovados, 0 falhas**.
  - Testes de componentes: **9 aprovados, 0 falhas**.
  - Build de produção: aprovado.
  - Manifesto, ícones e service worker PWA: aprovados.
- Compilação TypeScript isolada da função serverless: aprovada.
- Playwright específico do P8, em viewport mobile de 390 px: **1 aprovado**, incluindo resposta, Markdown, fontes, sugestão e revisão no diálogo de tarefa.
- Suíte Playwright sequencial completa executada durante o fechamento: **12 aprovados, 0 falhas**.
- Verificação SQL autenticada em transação: persistência prévia, isolamento RLS, contexto mínimo, conclusão auditada, bloqueio de segunda conclusão e bloqueio de escrita direta aprovados; transação revertida sem resíduos.
- `supabase db lint`: nenhuma ocorrência criada pelo P8.
- `git diff --check`: aprovado.

## Ocorrências e decisões técnicas

- A instalação completa do registry de AI Elements não concluiu no ambiente local. Foram incorporados apenas os componentes oficiais necessários, adaptados ao design system existente, mantendo a dependência `streamdown` para renderização segura.
- A revisão de privilégios identificou grants padrão de escrita na nova tabela. Foi criada e aplicada uma migration corretiva independente para deixar o histórico reproduzível e garantir privilégio mínimo.
- A autenticação local da Vercel CLI está expirada. Por isso, a chamada real ao AI Gateway não pôde ser validada localmente; a produção usa Vercel OIDC e a função possui fallback seguro e auditável. O endpoint deverá ser verificado novamente após a publicação pelo Git integrado.
- Os advisors remotos de segurança e performance do Supabase responderam com permissão negada para a credencial atual. A validação foi coberta por migration tests, teste SQL autenticado, inspeção de grants e `db lint`.
- O `npm audit` mantém duas ocorrências moderadas na linha 6 do React Router. A correção automática exige migração incompatível para a versão 7; o aplicativo é CSR e as rotas de fontes do P8 são geradas e validadas pelo servidor. A atualização de major foi registrada como dívida técnica, sem ampliar o escopo deste P.
- O build mantém o pacote de Markdown em chunk separado e o carrega somente ao entrar no assistente.

## Dívida técnica controlada

- Revalidar uma resposta real do AI Gateway no ambiente publicado e confirmar telemetria/tokens da interação.
- Renovar a autenticação local da Vercel CLI para inspeções diretas futuras.
- Planejar a migração do React Router 6 para 7 em ciclo próprio, com regressão completa de navegação.

## Próximo passo

Iniciar o P9 — CRM comercial — somente após o commit deste relatório e de toda a entrega P8.
