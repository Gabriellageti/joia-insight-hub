# Auditoria de responsividade — JoIA Ops

Coleta: current. 2026-08-30T19:38:43.369Z. 37 rotas (inclui redirect / e fallback *).

Ambiente local, navegador Chromium/Chrome com backend sintético interceptado; IA desligada. Nenhum acesso/mutação ao banco real. Coleta anterior às correções de UI quando phase=baseline-authorized.

¹ DOM OK não é aprovação visual ou funcional completa. Mede geometria e erros de página na tela inicial. Abas/dialogs, estados extremos, teclado físico e zoom exigem evidências separadas. NÃO VALIDADA indica ausência, redirect indevido ou fixture de detalhe indisponível. O recorte overflow-x-clip existente foi detectado pela posição dos controles, não apenas pelo scrollWidth do body.

| Rota | 320×568 | 375×667 | 430×932 | 768×1024 | 1024×768 | 1280×720 | 1440×900 | 1920×1080 | Problemas |
|---|---|---|---|---|---|---|---|---|---|
| /auth | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| / | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /meu-dia | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /dashboard | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /clientes | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /clientes/:id | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /clientes/:id/jornada | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /projetos | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /projetos/:id | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /diagnostico | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /diagnosticos/:id | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /templates | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /modelos-projeto | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /relatorios/consultoria | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /relatorios/consultoria/:id | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /assistente | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /automacoes | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /templates/novo | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /templates/:id/editar | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /templates/:id/preview | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /templates-diagnostico/:templateId/preview | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /plano-acao | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /minhas-tarefas | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /pendencias | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /indicadores | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /reunioes | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /reunioes/:id | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /documentos | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /playbooks | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /equipe | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /atividades | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /relatorios/operacional | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /financeiro | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /comercial | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /marketing | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| /configuracoes | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |
| * | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | DOM OK¹ | Sem achado geométrico nesta amostra; revisão visual separada |

## Prioridades identificadas antes das correções

- P0: conteúdo de Meu Dia com nomes longos excede 1000px e é cortado pelo shell em 320/375; ações inacessíveis apesar de scrollWidth global normal.
- P0: dialogs base sem limite de altura; formulários longos podem ultrapassar viewport curta.
- P1: ações do projeto sem wrap, cabeçalhos comprimidos, tabs e selects com mínimos incompatíveis com telas pequenas.
- P1: card de tarefa inteiro touch-none; scroll touch conflita com drag; sidebar móvel não fecha explicitamente ao navegar.
- P2: ações importantes menores que 44px; espaçamento e grids fixos de formulários; notificações com altura fixa.
- P3: refinamentos serão feitos somente após corrigir utilização/interação.

## Evidência e limites

JSON e screenshots: tmp/responsive/current/<viewport>/. Screenshots completos nas larguras 375, 768, 1440.

A primeira coleta baseline usou papel insuficiente nos mocks e redirecionou rotas administrativas; não é evidência dessas telas. baseline-authorized corrige o papel sintético admin_joia e usa fixture diagnostic_templates. Nenhuma regra de autorização da aplicação foi alterada.

Consulte RESPONSIVE_FINAL_REPORT.md para alterações, testes de interação, comparação e pendências. Produção, teclado nativo iOS/Android e zoom nativo não são inferidos de emulação.
