# Publicação — responsividade e Assistente desabilitado

Data: 30/08/2026, aproximadamente 16:45–16:48 (America/Sao_Paulo). Publicação expressamente solicitada pelo usuário após o relatório de homologação parcial.

## Resultado

- URL oficial: https://joia-ops-live.vercel.app
- Projeto/equipe: `joia-solucoes-projects/joia-ops-live`.
- ID do projeto: `prj_LGZhDd81ItPTUqxYjh4XNF8xSygm`.
- Deployment: `dpl_JCu3sJkTfvDLPkU4arm1RzZMnhER`, **READY**, Production.
- URL imutável: https://joia-ops-live-al7rwq9pg-joia-solucoes-projects.vercel.app
- Framework: Vite; build remoto concluído em 13s; APIs assistant/health disponíveis.
- Fonte: workspace da branch `codex/p4-p10-platform`, base `63914b2`, incluindo alterações locais de responsividade e gate da IA. Não é um deployment de um commit limpo; não houve commit/push/merge nesta publicação.
- Deployment anterior: `dpl_8EWobf18nNvFCRFwWbQUfvPtN2A4`, base `3bb672b0f5741281cfef6e7c818412c10d05071b`; ancestralidade dessa base no HEAD local confirmada.

## Procedimento

Vínculo e conta Vercel conferidos antes do envio. Usado `deploy --prod --skip-domain`, com projeto e equipe explícitos. GET de disponibilidade confirmou IA desligada; somente depois foi enviado POST vazio de verificação. Health respondeu healthy. O domínio oficial ainda apontava para o deployment anterior durante esses testes. Em seguida, `vercel promote` promoveu o mesmo artefato e `inspect` confirmou o novo deployment pelo domínio oficial.

Adicionado `.vercelignore` para excluir arquivos locais de ambiente, caches, artefatos temporários e evidências do upload. A configuração de runtime veio do projeto Vercel. Nenhum secret, variável de ambiente, billing ou schema foi alterado. Orientações das skills de deployment/CLI/ambientes foram usadas para separar preparação, verificação e promoção; a skill de navegador foi usada na inspeção mobile.

## Verificação pós-publicação

| Checagem | Evidência / resultado |
|---|---|
| Domínio oficial | `inspect` resolveu o deployment novo, READY |
| CSS responsivo publicado | HTTP 200 em `/assets/index-vVlzs3Lz.css`; presentes métricas visualViewport e regras `.ui-dialog` |
| Headers | CSP incluindo `frame-ancestors 'none'`, nosniff, Referrer-Policy e Permissions-Policy presentes no domínio real |
| `/api/assistant` GET | HTTP 200, `enabled:false`, `AI_ASSISTANT_DISABLED`, no-store; request ID `5fcd55f1-8e27-4aa3-9208-53d76dc30042` |
| `/api/assistant` POST vazio | HTTP 200, mesmo estado desabilitado; request ID `885fce34-0178-4301-b39e-3580589df340` |
| `/api/health` | HTTP 200, API/banco/automação healthy; request ID `820c9ae0-c8c9-4d50-bcf3-6f12becde583`, 19:46:04 UTC |
| PWA estática | Manifesto, três ícones e service worker retornaram HTTP 200 |
| Login no navegador, 375×667 | Campos e ações renderizados; largura do documento 375px, sem overflow global; CSS novo confirmado; screenshot inspecionado |
| Prompt de instalação | Exibido sobre a faixa inferior do login; ação de adiar presente no snapshot. O clique não foi executado: PowerShell interpretou a referência como variável. Fechamento produtivo desse prompt NÃO VALIDADO nesta rodada |
| Erros no navegador dessa inspeção | `errors` e `console` sem registros retornados |
| Logs Vercel | Consulta de erros do deployment nos últimos 15min não retornou registros; janela curta, não prova ausência de falhas futuras |

Probes não autenticaram usuários nem criaram registros empresariais. Não houve chamada ao AI Gateway; o POST ocorreu após confirmação de feature desabilitada e o handler retorna antes do provedor, contexto e audit trail. Não foi realizada auditoria financeira de consumo do Gateway. A tela autenticada `/assistente` no domínio real não foi exercitada nesta rodada; o estado UI tem a evidência local anterior, não um PASS produtivo autenticado.

Evidências locais adicionais: `tmp/responsive-deploy-smoke.mjs` e `tmp/responsive-production-login-375.png`. A captura com sufixo `dismissed` foi produzida depois do comando de clique falhar e NÃO prova fechamento do prompt. Arquivos `tmp` não são versionados/publicados.

## Limites e prontidão

**Publicação concluída; homologação permanece parcial e P11 permanece NO-GO.** Não foram repetidos os 21 passos do smoke produtivo nem os ensaios físicos/zoom/exaustivos. Backup/restore, integridade e os demais gates registrados continuam pendentes. Drains/alertas e monitoramento contínuo não foram configurados ou certificados nesta rodada. IA permanece opcional desabilitada; P12 não iniciado.

O deployment anterior foi registrado para rastreabilidade, mas não deve ser promovido cegamente em rollback: seu código não possui o gate desligado e antecede correções de compatibilidade/segurança posteriores. Qualquer reversão precisa preservar a decisão de IA desabilitada e a compatibilidade com o banco atual.

## Consolidação de endereço — 31/08/2026

Por solicitação do usuário, foi mantido apenas o alias público oficial `https://joia-ops-live.vercel.app`. O alias secundário `joia-ops-live-joia-solucoes-projects.vercel.app` foi removido da equipe e passou a responder HTTP 404. A listagem posterior retornou um único alias associado ao projeto.

A Proteção Padrão da Vercel já estava ativa (`all_except_custom_domains`). Em teste anônimo, a URL técnica imutável do deployment respondeu HTTP 302 para autenticação Vercel, enquanto o domínio oficial respondeu HTTP 200. Essa URL técnica não pode ser eliminada sem apagar o deployment que sustenta o domínio oficial; integrantes autenticados da equipe ainda podem acessá-la por desenho da plataforma. Portanto, existe um único endereço público funcional, sem perda da versão de rollback.

## Solicitação de domínio e marca Joia Labs — 31/08/2026

O usuário definiu `https://joia-labs.vercel.app` como o único endereço desejado e solicitou a troca da marca visível para **Joia Labs**. O domínio já está em uso e retorna uma versão diferente/mais antiga do aplicativo (assets e ETag distintos), mas não pertence ao projeto nem à equipe `joia-solucoes-projects`: `inspect` não o localizou, a listagem dos projetos da equipe não contém seu proprietário e a tentativa de atribuição ao deployment oficial retornou `alias already in use`. O CLI e a sessão web disponíveis acessam apenas a equipe Joia Solucoes; não há autoridade para liberar ou transferir esse alias externo.

A marca local foi atualizada no título/meta tags, login, sidebar, manifesto PWA, prompt de instalação, service worker/notificações, mensagem do Assistente desabilitado, calendário exportado, PDF e testes. `npm run check` passou: lint, TypeScript, 147 unitários, 9 componentes, build e PWA estática. Também foi estabilizado o teste temporal de clientes em atenção passando sua data de referência explicitamente, sem mudar a regra de produção.

**Não publicado:** publicar novamente em `joia-ops-live.vercel.app` contrariaria a instrução de usar somente o novo link. Para concluir, a conta/projeto Vercel que atualmente possui `joia-labs.vercel.app` deve remover o alias ou transferir acesso à equipe `joia-solucoes-projects`. Depois disso, o procedimento seguro é atribuir o alias ao novo deployment, validar marca/API/health/PWA e somente então remover `joia-ops-live.vercel.app`, evitando indisponibilidade.
