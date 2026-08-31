# Reativação futura do Assistente de IA

Estado desta release: **FEATURE OPCIONAL DESABILITADA** por decisão de negócio em 30/08/2026. Não contratar, ativar ou contornar billing nesta etapa.

## Contrato e proteção

- `AI_ASSISTANT_ENABLED` é exclusivamente server-side. Somente a string exata `true` habilita a geração; `false`, ausência ou valores inválidos mantêm o recurso desligado.
- `GET /api/assistant` publica apenas disponibilidade (`enabled`), com `Cache-Control: no-store`. Não retorna secrets nem valida créditos.
- Desabilitado, `POST /api/assistant` responde HTTP 200 com `{"enabled":false,"code":"AI_ASSISTANT_DISABLED"}` e request ID. É estado de produto, não geração nem falha operacional: não lê corpo/contexto, não autentica no Supabase, não abre auditoria, não chama o provedor, não cria tarefas e não executa fallback.
- O frontend aguarda a disponibilidade por até 5 segundos e falha fechado. Links com `auto=1`, histórico e sugestões não são montados enquanto desligado. Mudança da flag entre GET e POST também é tratada.
- Não usar `VITE_AI_ASSISTANT_ENABLED`. O navegador não decide a autorização da geração. `SUPABASE_SERVICE_ROLE_KEY` continua apenas no backend, sem logs/respostas/bundle.
- Migrations, RLS, RPCs, audit trail, rate limit, contexto, fontes e revisão humana permanecem preservados.
- Os scripts `p11-gateway-diagnostic.mjs` e `p11-ai-production-smoke.mjs` também exigem opt-in explícito. Seu resultado desabilitado não é PASS generativo.

## Sequência futura — requer nova decisão humana

1. O responsável da empresa habilita billing do Vercel AI Gateway na equipe `joia-solucoes-projects`. Não enviar dados de pagamento ou secrets pelo chat.
2. Confirmar créditos e limites de custo. O método existente é OIDC; não criar API keys alternativas nem trocar modelo para contornar billing.
3. Definir `AI_ASSISTANT_ENABLED=true` **somente em Preview**, no projeto oficial `joia-ops-live`; manter Production em `false`.
4. Publicar Preview com API compatível e banco de teste isolado, sem dados reais. Mudanças de variável exigem novo deployment; não presumir que alteram uma versão já publicada.
5. Executar e registrar a bateria real de IA com fixtures sintéticas A/B: contexto autorizado e negado (cliente, projeto, reunião, relatório e histórico), fontes verificáveis, prompt injection direto e armazenado, exfiltração cross-workspace, sugestões e confirmação humana obrigatória. Acrescentar erro de provedor/fallback honesto, timeout, rate limit, request ID, consumo e conclusão do audit trail. Conferir ausência de mutações sem confirmação. Esses testes saem de ADIADO somente com evidência, nunca por configuração.
6. Somente após aprovação técnica/humana e dos demais gates de produção, definir `true` em Production e promover/publicar a versão validada no projeto oficial. Fazer smoke imediato; não presumir que promover um artefato Preview resolve sozinho os escopos de ambiente.

## Desativação e rollback

Definir `false` no ambiente e publicar uma versão **que contenha o gate**. Validar GET/POST e UI antes de encerrar. A flag não cancela gerações já em voo; verificar audit trail dessas requisições. Não fazer rollback para código anterior ao gate (ele ignora a variável). Preservar a assinatura server-only da RPC; consultar `P11_ROLLBACK.md` antes de qualquer rollback de banco. Não excluir histórico nem relaxar RLS.

## Gate de implantação da versão desligada

No domínio oficial, conferir a mensagem exata da rota `/assistente`, GET/POST desabilitados/no-store/request ID, ausência de POST da UI com `auto=1`, ausência de chamadas ao provedor e de novos registros de geração/tarefa no intervalo sintético. Não repetir geração para diagnosticar falta de créditos. Testes locais não substituem essa verificação produtiva.
