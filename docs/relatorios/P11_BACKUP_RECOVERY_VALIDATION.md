# P11 — Backup e recuperação

Data: 30/08/2026. Alvo: `uopxixfgaaxsgqgrfpvx` (JoiaLabs).
Decisão do gate: **BLOQUEADO — NÃO VALIDADO; impeditivo de GO**.

## Configuração efetivamente observada

| Item | Resultado | Evidência |
|---|---|---|
| Projeto/região | PASS | CLI projects list: ACTIVE_HEALTHY, sa-east-1 |
| Organização | PASS | cmkljcraatrwqpmppxfe |
| Plano atual | BLOQUEADO — NÃO VALIDADO | Não exposto nas consultas CLI realizadas; conector vinculado a outra organização |
| PITR | FAIL — não habilitado | pitr_enabled=false |
| Lista de backups | BLOQUEADO — NÃO VALIDADO | backups=null |
| Metadados de backup físico | BLOQUEADO — NÃO VALIDADO | physical_backup_data={} |
| WAL-G | PASS — flag observada apenas | walg_enabled=true; não comprova ponto restaurável |
| Frequência e retenção reais | BLOQUEADO — NÃO VALIDADO | Nenhuma janela selecionável retornada |
| Restore isolado | BLOQUEADO — NÃO VALIDADO | Nenhum backup selecionado, alvo criado ou restore executado |
| Storage: recuperação de bytes | BLOQUEADO — NÃO VALIDADO | Política independente ainda não comprovada |
| Auth restaurado/memberships/sessões | BLOQUEADO — NÃO VALIDADO | Sem alvo restaurado para testar |
| Comparação de migrations após restore | BLOQUEADO — NÃO VALIDADO | Sem restore; registrar os dois novos IDs no futuro ensaio |
| RPO e RTO | BLOQUEADO — NÃO VALIDADO | Não propostos antes da medição, conforme decisão humana |

Reconsulta desta etapa:

```powershell
npx supabase backups list --project-ref uopxixfgaaxsgqgrfpvx --output json
```

Resposta: `{"backups":null,"physical_backup_data":{},"pitr_enabled":false,"region":"sa-east-1","walg_enabled":true}`.

Não se conclui “plano Free”, “sem qualquer cópia interna” ou “restore impossível” a partir dessa resposta. Também não se conclui que o serviço pode recuperar dados. **A capacidade demonstrada é insuficiente para liberar GO**. Se a confirmação administrativa mostrar que o plano não fornece recuperação aceitável, registrar exatamente **FAIL — CAPACIDADE DE RECUPERAÇÃO INSUFICIENTE PARA GO**.

## Opções e custos — documentação, não configuração contratada

A documentação informa backups diários em Pro/Team/Enterprise, com 7/14/até 30 dias. PITR é adicional desses planos, requer compute Small ou superior e tem valores indicativos de aproximadamente US$100/200/400 mensais para janelas de 7/14/28 dias, além dos demais custos. Confirmar orçamento atual no painel antes de contratar. [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups).

Restore para novo projeto exige elegibilidade e cobra os recursos do alvo. O clone copia o banco, mas configurações de Auth/API, Realtime e arquivos Storage exigem tratamento separado. Não criar destino com efeitos externos ativos. [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project).

Nenhum plano, PITR, compute, projeto ou armazenamento pago foi contratado. Não foi criado backup caseiro nem exportado banco empresarial para o workspace local.

## Próxima ação administrativa

Com uma sessão administrativa da organização correta, abrir o projeto oficial e registrar, sem secrets:

1. plano e recursos contratados;
2. Database → Backups: backups selecionáveis, status, horários UTC, retenção e janela PITR;
3. elegibilidade e orçamento de Restore to a New Project;
4. política/retencão independente dos objetos Storage;
5. autorização humana do custo e destino isolado.

Somente então criar fixtures de controle P11-E2E, esperar um ponto que as contenha, restaurar isoladamente e comparar IDs, relações, schema/RLS, Auth e hashes dos arquivos conforme [DATABASE_RECOVERY.md](../runbooks/DATABASE_RECOVERY.md). RPO/RTO serão medidos, não presumidos.
