# P11 — Validação da IA real em produção

Data: 30/08/2026. Projeto/equipe: `joia-ops-live` / `joia-solucoes-projects`.
Modelo preservado para reativação: **openai/gpt-5.6-luna**. Estado vigente: **ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO**. Nenhum teste do modelo é PASS por este motivo. IA não será disponibilizada nesta release e não condiciona o GO do núcleo. A segurança do caminho desligado tem [evidência própria](P11_AI_OPTIONAL_FEATURE.md).

## Evidência histórica — anterior à decisão de desativação, não repetir agora

`npx vercel env run -e production -- node scripts/p11-gateway-diagnostic.mjs`, em `2026-08-30T16:56:37.464Z`:

- OIDC presente; API key própria ausente.
- Catálogo lista o modelo configurado.
- API de créditos: saldo 0, consumo total 0.
- Prompt sintético mínimo: “Responda apenas OK.”
- Geração: HTTP 403, GatewayInternalServerError; Gateway exige cartão válido para atender solicitações.
- Nenhum modelo foi trocado, cartão manipulado ou secret exibido. Nenhuma variável Vercel foi alterada.

O diagnóstico é uma chamada local autenticada com o ambiente do projeto oficial, não uma geração bem-sucedida via `/api/assistant`. Não equivale a aprovação da IA em produção. O billing ativo do plano Hobby observado anteriormente também não equivale a créditos liberados no Gateway.

## Matriz solicitada

| Cenário | Estado atual | Evidência/limite |
|---|---|---|
| Modelo disponível e autenticação OIDC | PASS | Catálogo/créditos respondem com a identidade do projeto |
| Geração simples real | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Não é PASS |
| Contexto autorizado cliente/projeto/reunião/tarefa/relatório | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Provedor não gerou resposta |
| Histórico e fontes correspondentes ao contexto | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Nenhuma citação real foi produzida |
| Sugestão de tarefa | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Não simular com fallback |
| Revisão e confirmação humana de sugestão real | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | E2E simulado preserva contrato, não prova modelo |
| Rate limit com modelo real e cobrança | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Nenhum ensaio faturado nesta rodada |
| Fallback/erro de provedor habilitado | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | PASS histórico preservado, fallback não usado na feature off |
| Timeout do provedor | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Timeout da consulta de disponibilidade é testado separadamente |
| Prompt injection do usuário | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Não certifica resistência do modelo |
| Injection em documento/reunião/tarefa/comentário/relatório | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Nenhum ensaio generativo armazenado certificado |
| Exfiltração cross-workspace via modelo | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | RLS dos módulos habilitados continua gate obrigatório |
| Mutation attack via modelo | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Nenhuma ferramenta de mutação adicionada |
| Audit trail de geração real | ADIADO — FEATURE DESABILITADA POR DECISÃO DE NEGÓCIO | Caminho off não deve abrir geração inexistente |
| Conclusão da RPC por authenticated | PASS no catálogo reconsultado | EXECUTE authenticated=false e service_role=true na assinatura de 11 argumentos; teste anterior autenticado negado; nova geração aguarda gate |

## Retomada

Somente após nova decisão humana de disponibilizar o recurso, seguir [ENABLE_AI_ASSISTANT.md](../runbooks/ENABLE_AI_ASSISTANT.md): billing/créditos confirmados, flag true em Preview, bateria real aprovada e depois Production. Não ativar/contratar nada agora. Cada resposta futura precisa de request ID, interaction_id, duração, fontes e conclusão server-side; conferir mutações antes/depois. Nunca classificar fallback como resposta do modelo.

Sem evidência generativa não há aprovação do modelo; isso **não bloqueia GO da release desligada**. O NO-GO atual decorre dos gates de recuperação, smoke habilitado e segurança/integridade ainda pendentes, não da ausência de billing.
