# P4 — Central de Documentos e Arquivos

Data de conclusão: 29/08/2026

## O que foi criado

- Central única de documentos com busca textual, paginação e filtros executados no banco.
- Versionamento por grupo, com apenas uma versão corrente e numeração atômica.
- Arquivamento reversível e exclusão definitiva restrita a gestores.
- Auditoria imutável de criação, edição, versão, arquivamento, restauração e exclusão.
- Componentes reutilizáveis da central dentro de clientes e projetos.
- Estados de loading, vazio, erro recuperável e navegação mobile.
- Preparação para provedores futuros por `source_provider`, `external_id` e `external_url`.

## O que foi alterado

- O hook de documentos deixou de carregar a tabela inteira e passou a consultar páginas de 24 itens.
- A busca passou a usar `tsvector` e índice GIN no PostgreSQL.
- A abertura de arquivos continua usando URL assinada do bucket privado.
- O fluxo de exclusão remove o objeto do Storage antes do metadado, preservando consistência.
- Uploads agora registram nome físico, nome de exibição, descrição, vínculos, responsável, tamanho, MIME type, storage path e versão.
- Dados simulados antigos e não utilizados foram removidos.

## Migrations

- `20260829021434_p4_document_central.sql`
- Aplicada ao projeto Supabase conectado e registrada no histórico remoto.
- Backfill compatível com os campos legados `url` e `description`.
- Bucket `documents` mantido privado, limitado a 50 MB e a tipos MIME permitidos.

## Novas tabelas

- `public.document_events`: trilha de auditoria sem permissão de escrita para clientes autenticados.

## Componentes

- `DocumentsWorkspace`
- `DocumentEditDialog`
- `DocumentVersionDialog`
- Evoluções em `UploadModal` e `FileCard`
- Evolução de `useDocuments` para filtros, paginação, versões, arquivo e restauração.

## Rotas

- `/documentos` foi preservada e passou a usar a nova central.
- `Cliente → Documentos` foi adicionado à rota existente `/clientes/:id`.
- `Projeto → Documentos` foi adicionado à rota existente `/projetos/:id`.
- Anexos de reuniões continuam na rota `/reunioes/:id`, agora usando arquivamento seguro.

## Políticas RLS

- Quatro políticas em `public.documents`: SELECT, INSERT, UPDATE e DELETE.
- Leitura e escrita respeitam workspace e, quando houver projeto, a associação explícita ao projeto.
- Exclusão definitiva exige nível de gestor ou superior.
- Quatro políticas em `storage.objects`: SELECT, INSERT, UPDATE e DELETE.
- Leitura do objeto exige que o metadado correspondente seja visível pela RLS de documentos.
- `document_events` permite apenas leitura a membros operacionais; escrita ocorre exclusivamente pelo trigger de auditoria.

## Testes realizados

- Lint e TypeScript sem erros.
- 101 testes unitários aprovados, incluindo 4 testes específicos da migration P4.
- 9 testes de componentes aprovados.
- Build de produção e verificação PWA aprovados.
- 7 testes E2E gerais aprovados; 2 deles específicos do P4.
- Validação responsiva em 390 px e matriz existente de 320, 375, 768, 1024 e 1440 px.
- Validação transacional real no banco para criação, segunda versão, versão corrente, arquivamento e auditoria; rollback confirmado sem resíduos.
- `supabase db lint` sem erros.
- Advisors de segurança e performance sem erros.

## Problemas encontrados

- O histórico remoto possui migrations legadas com timestamps diferentes dos arquivos locais. A migration P4 foi aplicada transacionalmente e seu único registro foi reparado como `applied`, sem alterar entradas legadas.
- O executável dedicado `agent-browser` não está instalado neste ambiente. A verificação visual foi executada pelo Playwright/Chromium do projeto, cobrindo conteúdo, console, responsividade e estado de erro.
- Não havia documentos em produção no momento do backfill; nenhum arquivo legado precisou ser movido.

## Dívidas técnicas restantes

- A reconciliação completa dos timestamps de migrations anteriores ao P0 continua fora do escopo, pois alterá-los sem uma auditoria histórica separada seria arriscado.
- Integrações Google Drive/Docs/Sheets/Slides estão apenas preparadas no modelo, conforme solicitado.
- Upload resumível para arquivos grandes não foi necessário porque o limite operacional foi definido em 50 MB.

## Sugestões para próxima etapa

- Reutilizar os metadados e vínculos estruturais dos documentos nos templates do P5 sem copiar arquivos operacionais ou históricos.
- Permitir que templates referenciem documentos estruturais opcionais por identificador, mantendo uma única cópia física.
