# Recuperação do diálogo de pagamento

## Proveniência

- **Último deployment de produção usado como referência:** `61094c8d5a344c64be4c04d03d1e742b172cd79f` (`Adicionou diálogo de contratos`, 31/05/2026 17:31:23 UTC).
- O commit preserva a ação **“Marcar como pago”** em `src/pages/Financeiro.tsx`. Ele é o último artefato de produção anterior a 14/07/2026 identificado no histórico disponível para a janela investigada.
- O snapshot Lovable imediatamente anterior às mudanças de 14/07 é `b0035b593e00a3e1d7e123a93b5ac8fab1571470` (`Changes`, 14/07/2026 17:34:32 UTC). Nesse snapshot, o schema tipado ainda expõe `paid_at`, `payment_method`, `payment_notes`, `contract_id` e `installment_id`, embora a tela tenha reduzido o recebimento a uma ação direta.

O clone fornecido não contém remote configurado. Portanto, a associação acima registra o SHA do artefato Git presente no clone, e não um identificador interno do provedor de deploy que não possa ser verificado localmente.

## Escopo recuperado

A recuperação foi deliberadamente restrita a:

1. campos de pagamento e vínculos de `FinancialRecord`;
2. diálogo para registrar, corrigir ou desfazer um pagamento;
3. mapeamento entre camelCase da aplicação e snake_case do Supabase;
4. atualização atômica do recebimento e da parcela de contrato vinculada.

A página de contratos não foi revertida. Os fluxos posteriores permanecem preservados e os vínculos usam os identificadores atuais `contract_id` e `installment_id`.

## Commits da recuperação

- `f87fbf67518b782c7367544daa145b65184548a8` — restaura modelo, mapeadores e diálogo de pagamento;
- `1168bd8eecae3a6a1f8935dc9866c355c67f1e1a` — preserva detalhes ao editar contas a receber;
- `6694cb05423b8bb4763f3d8e23f3e3113b3b7965` — reconcilia o schema sem sobrescrever dados existentes;
- `ab8bfced436a5b0f45f2e3656a8660d34f9032bd` — sincroniza `financial_records` com parcelas pelos identificadores atuais.
