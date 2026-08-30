# JoIA Ops — Recuperação de dados

Estado em 30/08/2026: **runbook preparado, execução BLOQUEADA — NÃO VALIDADA**.
Produção: Supabase `uopxixfgaaxsgqgrfpvx`; aplicação `https://joia-ops-live.vercel.app`.
RPO/RTO: não medidos, sem compromisso numérico aprovado.

## Guardrails

- Nunca restaurar por cima da produção para testar.
- Não contratar recurso pago sem aprovação de custo e destino.
- Não exportar secrets, hashes de senha ou dados empresariais para chats, logs ou artefatos públicos.
- Tratar eventual clone como produção em termos de sigilo. Usar fixtures para verificações e restringir acesso administrativo; não expor o clone publicamente.
- Suspender cron, webhooks, automações, e-mail e outros efeitos externos no destino antes de seu uso. O plano de isolamento precisa cobrir o intervalo da criação do clone; não presumir que desabilitar depois elimina esse risco.
- Não replayar seeds/reconciliações financeiras para alinhar números de migration.
- Não eliminar auditoria nem projetos/backups de recuperação antes da revisão humana.

## Incidente — sequência operacional

1. **Conter escritas:** responsável identifica fluxos afetados e aprova manutenção quando necessária; evitar desligar leitura saudável indiscriminadamente.
2. **Marcar o incidente:** registrar instante UTC/local, commit, deploy, últimas migrations e request IDs, sem copiar dados sensíveis desnecessários.
3. **Escolher ponto seguro:** identificar última escrita válida e início da corrupção; comparar com os pontos recuperáveis realmente disponíveis.
4. **Preservar evidências:** logs de auditoria, catálogo/histórico, IDs e fingerprints; manter integridade e controle de acesso.
5. **Selecionar backup/PITR:** registrar identificador/status e timestamp; não prosseguir com backup falho, vazio ou sem janela confirmada.
6. **Restaurar isoladamente:** confirmar projeto destino distinto da produção, região, custo, permissões e bloqueio de efeitos externos; registrar início/fim da operação.
7. **Validar dados:** comparar fixtures e relações, contagens relevantes e consistência referencial. Em corrupção lógica, recuperar seletivamente após aprovação; não substituir indiscriminadamente dados válidos novos.
8. **Validar migrations:** comparar `supabase_migrations.schema_migrations` entre origem/ponto seguro/destino e o catálogo real. Conferir grants financeiros server-only, RLS, functions/triggers de auditoria e RPC de IA; não confiar apenas nos números do histórico.
9. **Validar Auth:** comparar fixture auth.users/perfil/membership/identidade; testar senha sintética, renovação, logout e revogação. Revisar URLs de redirect, provedores e chaves do destino. Não presumir que sessões antigas são inválidas só porque um usuário foi removido.
10. **Validar Storage:** conferir separadamente bytes, tamanho/hash, metadata, bucket privado, versões e signed URLs A/B. Um registro storage.objects não prova que o arquivo existe. [Limite do backup PostgreSQL](https://supabase.com/docs/guides/platform/backups).
11. **Decidir promoção:** responsável técnico e de negócio assinam comparação, perda de dados estimada e rollback. Nenhuma promoção automática pelo agente.
12. **Executar smoke:** domínio/destino aprovado, usuários e dados P11-E2E, fluxos centrais, IA real, sessão e auditoria; guardar evidência.
13. **Reabrir:** restabelecer escritas e efeitos externos gradualmente, observar erros, comunicar janela e reconciliações pendentes; registrar encerramento e lições.

## Ensaio de restore — dados de controle

Após confirmar elegibilidade/orçamento, criar `P11-E2E-RESTORE-Cliente`, projeto, tarefa e documento sintético em workspace isolado. Registrar test_run_id, IDs, timestamps UTC, relações, revisão de schema e hash do conteúdo. Não reutilizar dados reais como fixtures.

Esperar um backup/ponto confirmado que contenha as fixtures. No destino, comprovar existência, valores e relações; verificar negativa cross-workspace com usuário B. Registrar pontes de dados entre os dois projetos somente por mecanismos aprovados, sem colocar chaves no browser.

Medir separadamente:

- intervalo entre última escrita sintética recuperada e momento de corte do ensaio;
- duração de provisionamento/restore;
- duração de validação, reconfiguração de Auth/Storage e smoke;
- tempo total até liberação humana para operação.

Essas medições fundamentam a proposta de RPO/RTO e a margem operacional. O valor só vira objetivo do negócio após aceitação explícita; um ensaio não é garantia universal.

## Matriz de recuperação

| Cenário | Proteção comprovada hoje | RPO | RTO | Procedimento |
|---|---|---|---|---|
| Exclusão acidental | Histórico activity_logs preservado; não é cópia integral dos dados | Não medido | Não medido | Localizar snapshot/backup, restaurar isolado, recuperar seletivamente |
| Migration ruim | Arquivos versionados e dois fixes rastreáveis; restore pendente | Não medido | Não medido | Conter, comparar catálogo, ensaiar correção progressiva/restore |
| Corrupção lógica | Auditoria ajuda diagnóstico; não reconstrói todo conteúdo | Não medido | Não medido | Escolher ponto anterior, reconciliar escritas válidas |
| Perda parcial | Backup recuperável não comprovado | Não medido | Não medido | Validar cópia isolada e relações antes de importar |
| Perda total do projeto | Proteção independente não comprovada | Não medido | Não medido | Acionar suporte e estratégia previamente aprovada; não presumir backup disponível após exclusão do projeto |
| Arquivo excluído | Recuperação de bytes não comprovada | Não medido | Não medido | Recuperar versão/cópia de objetos e verificar hash/metadata |
| Secret comprometido | Boundary server-side; não impede uso de secret vazado | Não se aplica como simples restore | Não medido | Revogar/rotacionar credencial, sessões e acessos afetados, preservar evidências; restore não desfaz exposição |

## Política de cleanup do ensaio

Remover somente IDs sintéticos registrados e objetos pelos caminhos conhecidos. Manter activity_logs marcados test_run_id, inclusive falhas. Para outros históricos, verificar cascatas antes de remover; arquivar/restringir acesso quando não houver retenção segura validada. Não desabilitar triggers/constraints. Recursos temporários pagos só podem ser encerrados após aprovação e preservação da evidência necessária; registrar removido, retenção e possibilidade de recuperação.
