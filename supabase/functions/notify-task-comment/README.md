# notify-task-comment

Variáveis obrigatórias: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` e `ALLOWED_ORIGINS` (lista separada por vírgulas).

E-mail exige `RESEND_API_KEY` e `RESEND_FROM`. Push exige
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (por exemplo,
`mailto:seguranca@empresa.com`). A função exige JWT no gateway e recebe apenas
`commentId`; título, autor, conteúdo, tarefa e destinatários são validados no
banco. A migration de autorização cria o registro privado de idempotência.
