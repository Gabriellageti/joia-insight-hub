# P11 — Candidato de integração, não promovido

Data: 30/08/2026. Branch isolada: `codex/p11-merge-candidate`.
Worktree: `tmp/p11-merge-candidate`.

## Histórico observado

A main inicialmente conhecida era `8da21c37b3076e6335796c941cb7f90cceb2bed3`, com 11 commits exclusivos. O fetch desta etapa encontrou `346db16c9d7e8b40c6c76882ebc5fa05f1f04a9a`: merge do PR #127 às 13:12:53 -03:00, com pais `8da21c3` e `f3ca148`.

Esse merge já estava no GitHub e **não foi executado por esta etapa**. Foi preservado, sem reset/revert/force push. Não se trabalhou sobre uma suposição desatualizada de main. Os 11 commits permanecem ancestrais do candidato.

O candidato combina main atual com correções `888e195` e ajuste do harness `72de436`. SHA candidato: **`28a86f3ee52839874d0e0abddd15bc887ff593f6`**. Os merges `70d6c26` e `28a86f3` existem apenas na branch temporária local. Nenhum merge novo foi feito na main, nem o candidato foi implantado.

## Revisão semântica dos commits financeiros

Os cinco commits de merge PR122–126 preservam ancestralidade. Os seis commits de conteúdo foram revisados pelo diff agregado e pelos testes:

| Commit | Conteúdo | Avaliação |
|---|---|---|
| ab40826 | Cobrança semanal, cálculo local de datas, tipos/UI | Preservado; testes de data passam; não comprova regras de cobrança reais |
| 21f1f79 | Seed de ciclos financeiros específicos | Replay automático proibido; depende de cliente real único e IDs fixos |
| a525c42 | Correção de lookup para name/trade_name | Preservada; não dispensa validar identidade/tenant do cliente alvo |
| 054510c | Reconciliação histórica e policy financeira | Policy vulnerável contida pela nova migration; DML dependente de dados reais não reaplicado |
| 0529afb | Título e vínculo de projeto no contrato | Preservado; testes passam |
| 732ca71 | IDs de parcelas, apresentação de pagamentos, reparo de vínculos | Preservado; efeitos numéricos e históricos exigem validação financeira isolada |

### 20260829190000 — seed de ciclos

- Requer exatamente um cliente nominal; falha em banco sintético vazio e pode ficar ambíguo entre tenants.
- IDs de contrato/cobrança são determinísticos; ON CONFLICT atualiza dados existentes, não significa operação sem efeito.
- O replay pode sobrescrever valor, vencimento, descrição e vínculos de cobranças, embora não redefina seu status.
- Calendários e valores codificados são dados de negócio, não defaults de schema.
- **BLOQUEADO — NÃO VALIDADO para reaplicação**, sem consultar ou alterar dados reais nesta etapa.

### 20260829210000 — reconciliação e permissões

- Localiza contratos por cliente, valor e janela de início; localiza cobranças por valor, data e descrição.
- Pode inserir cobranças ausentes, trocar vínculos e reconstruir JSON de parcelas; reconciliação precisa de aprovação de negócio e comparação em cópia isolada.
- O GRANT e a policy reabrem acesso amplo. A migration compensatória posterior restaura server-only, mas executar apenas a antiga reintroduziria a falha.
- Catálogo e migration history estavam divergentes: policy presente sem a versão correspondente na consulta do histórico. Não foi falsificado/normalizado esse histórico.
- **FAIL da policy antiga; contenção nova PASS; DML BLOQUEADO — NÃO VALIDADO**.

### 20260829223000 — reparo de vínculos

- Só tenta reparar quando há uma parcela compatível por data e valor.
- Isso não prova unicidade de cobranças concorrentes para a mesma parcela. Várias cobranças podem disputar o ID se apontarem à mesma combinação.
- Modifica ID/status no JSON do contrato conforme cobrança; não atualiza diretamente financial_records.
- **BLOQUEADO — NÃO VALIDADO para reaplicação** sem inventário de vínculos e ensaio isolado.

### Riscos de aplicativo a decidir

`buildContractInstallments` preserva IDs/status por índice, mas recalcula valores e datas inclusive para parcelas pagas. O teste existente espera esse comportamento; não prova reconciliação com recebíveis já pagos. Reduzir o número de parcelas também requer verificar vínculos remanescentes. Essas regras não foram alteradas para fazer a suíte passar e não foram certificadas como financeiramente seguras.

## Suítes e limites

| Suíte no candidato | Resultado |
|---|---|
| ESLint | PASS |
| TypeScript | PASS |
| Bun | PASS — 149 testes |
| Componentes | PASS — 9 testes / 7 arquivos |
| Build + verificação do SW/manifesto | PASS |
| Playwright E2E | Primeira bateria PASS 15/15; SHA final: uma execução 14/15 e nova execução 15/15 sem mudar código/timeouts; backend simulado |
| Playwright PWA sobre build | PASS — 3 testes |
| Browser auxiliar | PASS — formulário /auth e prompt de instalação renderizados, sem erro reportado |
| Migrations financeiras contra cópia de produção | BLOQUEADO — NÃO VALIDADO |
| Smoke completo no domínio oficial | BLOQUEADO — NÃO VALIDADO |

A bateria inicial rodou sobre a árvore `32c86bafb6e6883bbd14125f5ba4c69ca9ebb776`; o SHA final acima acrescenta somente o ajuste do harness de tarefa sintética. No SHA final, check passou (149 unitários, 9 componentes, build/PWA); PWA browser passou 3/3; E2E padrão teve 14 PASS e 1 FAIL: heading do Assistente não apareceu em 5 segundos. Não atribuir definitivamente à carga sem diagnóstico. Os logs locais ficam em `tmp/p11-candidate-*.log`; a falha deve permanecer registrada mesmo se uma repetição passar.

Os testes de migration herdados verificam texto, incluindo um teste que reconhece o GRANT antigo. Não são prova do estado efetivo de segurança; a consulta de grants/policies e os ataques REST após a contenção são a evidência relevante.

Nova execução padrão no mesmo SHA, sem outras suítes simultâneas: **15 PASS em 1,5 minuto**, log `tmp/p11-candidate-e2e-repeat.log`. Check final: 149 unitários/9 componentes/build/PWA PASS. PWA final: 3 PASS em 10,7s. Não houve alteração de timeout, retry automático, remoção de teste ou mudança no código entre a falha e a repetição positiva. A causa da intermitência não foi provada; permanece ressalva de confiabilidade.

## Decisão

**Não promover.** Suítes de aplicação aprovadas não liberam migrations dependentes de dados financeiros reais, recuperação não ensaiada ou a IA real. Um futuro rollout deve selecionar apenas migrations aprovadas, comparar catálogo/histórico, preservar os dados existentes e comprovar o estado final server-only. Não executar `db push`/repair global para resolver diferenças de Git.
