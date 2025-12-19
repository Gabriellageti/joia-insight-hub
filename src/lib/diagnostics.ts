import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Diagnostic, DiagnosticTemplate } from "@/types";
import { formatDatePtBR, parseDatePtBR } from "@/lib/dates";

type Status = Diagnostic["status"];

type BaseDiagnosticInput = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  templateId: string;
  templateName: string;
  responsibleName?: string;
  responsibleId?: string;
  dueDate?: string;
  autoGenerateOpportunities?: boolean;
  name?: string;
};

export interface ApplyDiagnosticInput extends BaseDiagnosticInput {
  templateQuestionCount?: number;
}

export interface UpdateDiagnosticInput extends Partial<Diagnostic> {
  id: string;
}

const currentMonthLabel = () => format(new Date(), "MM/yyyy", { locale: ptBR });

const defaultName = (templateName: string, projectName: string, referenceDate: Date = new Date()) => {
  return `${templateName} • ${projectName} • ${format(referenceDate, "MM/yyyy", { locale: ptBR })}`;
};

const templateSeed: DiagnosticTemplate[] = [
  {
    id: "template-1",
    name: "Operações SaaS",
    description: "Checklist base de governança e eficiência para operações SaaS.",
    tags: ["SaaS", "Operações", "Governança"],
    status: "published",
    sections: [
      {
        id: "ops-saas-1",
        title: "Governança",
        description: "Estrutura mínima de decisão e acompanhamento.",
        order: 1,
        weight: 1,
        audit: { updatedAt: "05/02/2025" },
        questions: [
          {
            id: "ops-saas-1-q1",
            title: "Existe um comitê recorrente de operações?",
            description: "Com agenda, ata e responsáveis definidos.",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Comitês semanais ou quinzenais costumam ser o mínimo viável.",
            regraOportunidade: {
              id: "ops-saas-op-1",
              name: "Criar oportunidade de governança",
              description: "Sem fórum de decisão recorrente.",
              type: "Eficiência operacional",
              estimatedValue: 50000,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/02/2025" },
            },
            audit: { updatedAt: "05/02/2025" },
          },
          {
            id: "ops-saas-1-q2",
            title: "Roadmap priorizado está visível para o time?",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 2,
            audit: { updatedAt: "05/02/2025" },
          },
        ],
      },
      {
        id: "ops-saas-2",
        title: "Eficiência",
        description: "Rotinas e SLAs críticos.",
        order: 2,
        weight: 1,
        audit: { updatedAt: "05/02/2025" },
        questions: [
          {
            id: "ops-saas-2-q1",
            title: "Existe SLA formal de suporte?",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 1,
            audit: { updatedAt: "05/02/2025" },
          },
          {
            id: "ops-saas-2-q2",
            title: "Tempo médio de implantação (em dias)",
            type: "number",
            weight: 1,
            criticality: "baixa",
            required: false,
            order: 2,
            minValue: 0,
            audit: { updatedAt: "05/02/2025" },
          },
        ],
      },
    ],
    questionCount: 4,
    sectionsCount: 2,
    estimatedTimeMinutes: 30,
    version: "v1.4",
    updatedAt: "05/02/2025",
    createdAt: "10/01/2025",
  },
  {
    id: "template-2",
    name: "Diagnóstico de Compras JoIA",
    description: "Avalia maturidade do setor de Compras para identificar desperdícios, melhorar negociação, reduzir ruptura e excesso, e encontrar 'dinheiro na mesa'.",
    tags: ["Compras", "Estoque", "Margem", "Fornecedores", "Processos", "Caixa"],
    status: "published",
    sections: [
      // SEÇÃO 1: Governança e Fluxo de Compras (Peso: 15)
      {
        id: "compras-s1",
        title: "Governança e Fluxo de Compras",
        description: "Estrutura mínima de decisão, fluxos e aprovações.",
        order: 1,
        weight: 15,
        audit: { updatedAt: "19/12/2024" },
        questions: [
          {
            id: "compras-q1",
            title: "Existe um fluxo formal para solicitação de compras (quem solicita, como solicita, e quando)?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Fluxo documentado com responsáveis e prazos definidos.",
            regraOportunidade: {
              id: "compras-op-q1",
              name: "Criar fluxo de solicitação de compras",
              description: "Ausência de fluxo formal de solicitação de compras",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q2",
            title: "Existe regra de aprovação por valor (alçadas) para compras?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Ex: até R$500 sem aprovação, R$500-2000 gestor, acima diretoria.",
            regraOportunidade: {
              id: "compras-op-q2",
              name: "Definir alçadas de aprovação",
              description: "Compras sem alçada definida aumentam risco de gasto indevido e urgência",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q3",
            title: "Quantas compras urgentes acontecem por semana?",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            minValue: 0,
            helperText: "Compras urgentes indicam falta de planejamento.",
            regraOportunidade: {
              id: "compras-op-q3",
              name: "Reduzir compras urgentes",
              description: "Alto volume de compras urgentes indica falta de planejamento e pior negociação",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 3 },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q4",
            title: "Existe SLA interno para cotar, aprovar e receber compras?",
            type: "yes_no",
            weight: 1,
            criticality: "baixa",
            required: false,
            order: 4,
            helperText: "Ex: cotação em 24h, aprovação em 48h.",
            regraOportunidade: {
              id: "compras-op-q4",
              name: "Definir SLA de compras",
              description: "Ausência de SLA causa atrasos, urgência e ruptura",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
        ],
      },
      // SEÇÃO 2: Planejamento de Compra e Demanda (Peso: 20)
      {
        id: "compras-s2",
        title: "Planejamento de Compra e Demanda",
        description: "Como a empresa planeja suas compras com base em dados.",
        order: 2,
        weight: 20,
        audit: { updatedAt: "19/12/2024" },
        questions: [
          {
            id: "compras-q5",
            title: "Vocês compram com base em histórico de vendas e giro de estoque?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Usar dados para decidir o que e quanto comprar.",
            regraOportunidade: {
              id: "compras-op-q5",
              name: "Comprar baseado em giro",
              description: "Compras sem base em giro e vendas geram excesso, ruptura e caixa preso",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q6",
            title: "Existe definição de estoque mínimo e máximo por item ou por categoria?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Parâmetros que guiam quando e quanto repor.",
            regraOportunidade: {
              id: "compras-op-q6",
              name: "Definir mínimo e máximo",
              description: "Sem mínimo e máximo, o estoque oscila e prende caixa",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q7",
            title: "Em média, quantas rupturas de itens importantes ocorrem por semana?",
            type: "number",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 3,
            minValue: 0,
            helperText: "Itens que faltaram e causaram perda de venda.",
            regraOportunidade: {
              id: "compras-op-q7",
              name: "Reduzir rupturas",
              description: "Ruptura recorrente gera perda direta de venda",
              type: "Receita incremental",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 3 },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q8",
            title: "Existe sazonalidade considerada nas compras (datas, clima, eventos)?",
            type: "scale",
            weight: 1,
            criticality: "media",
            required: false,
            order: 4,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Nunca considero, 5 = Sempre ajusto compras por sazonalidade.",
            regraOportunidade: {
              id: "compras-op-q8",
              name: "Considerar sazonalidade",
              description: "Baixa consideração de sazonalidade aumenta risco de excesso e ruptura",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
        ],
      },
      // SEÇÃO 3: Cadastro, Portfólio e Curva ABC (Peso: 15)
      {
        id: "compras-s3",
        title: "Cadastro, Portfólio e Curva ABC",
        description: "Qualidade do cadastro e uso da Curva ABC.",
        order: 3,
        weight: 15,
        audit: { updatedAt: "19/12/2024" },
        questions: [
          {
            id: "compras-q9",
            title: "Existe padronização de cadastro de produtos (nome, unidade, embalagem)?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Cadastro consistente para evitar duplicidades.",
            regraOportunidade: {
              id: "compras-op-q9",
              name: "Padronizar cadastro",
              description: "Cadastro inconsistente gera compra errada, divergência e análise falha",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q10",
            title: "Existem itens duplicados no cadastro (mesmo produto com nomes diferentes)?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Ex: 'Coca 2L' e 'Coca-Cola 2 litros' no mesmo sistema.",
            regraOportunidade: {
              id: "compras-op-q10",
              name: "Higienizar cadastro duplicado",
              description: "Itens duplicados distorcem compra, giro e margem",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "yes" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q11",
            title: "Existe Curva ABC atualizada?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 3,
            helperText: "Classificação de itens por faturamento/margem.",
            regraOportunidade: {
              id: "compras-op-q11",
              name: "Criar Curva ABC",
              description: "Sem Curva ABC, perde-se foco nos itens que movem caixa e margem",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q12",
            title: "A Curva ABC é usada para decidir prioridade de compra e negociação?",
            type: "scale",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 4,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Não uso, 5 = Toda compra considera a curva.",
            regraOportunidade: {
              id: "compras-op-q12",
              name: "Aplicar Curva ABC nas decisões",
              description: "Curva ABC existe mas não é aplicada nas decisões",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
        ],
      },
      // SEÇÃO 4: Fornecedores e Negociação (Peso: 20)
      {
        id: "compras-s4",
        title: "Fornecedores e Negociação",
        description: "Gestão de fornecedores, cotações e condições comerciais.",
        order: 4,
        weight: 20,
        audit: { updatedAt: "19/12/2024" },
        questions: [
          {
            id: "compras-q13",
            title: "Você consegue listar as condições acordadas por fornecedor (preço, prazo, frete, bonificação)?",
            type: "scale",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Não tenho registro, 5 = Tudo documentado e atualizado.",
            regraOportunidade: {
              id: "compras-op-q13",
              name: "Documentar condições de fornecedores",
              description: "Condições não registradas geram perda de negociação e cobrança de bonificação",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q14",
            title: "Com que frequência vocês fazem cotação com mais de um fornecedor?",
            type: "multiple_choice",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"],
            helperText: "Cotação comparativa reduz custos.",
            regraOportunidade: {
              id: "compras-op-q14",
              name: "Aumentar cotações comparativas",
              description: "Baixa cotação reduz concorrência e aumenta preço médio de compra",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "multiple_choice", matchingOptions: ["Raramente", "Nunca"], matchStrategy: "any" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q15",
            title: "Existe controle de reajuste de preços e contestação quando necessário?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 3,
            helperText: "Acompanhar variação de custo e negociar.",
            regraOportunidade: {
              id: "compras-op-q15",
              name: "Controlar reajustes de preço",
              description: "Aumento de custo aceito sem contestação corrói margem",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q16",
            title: "Existem bonificações, rebates ou verbas comerciais que vocês recebem e controlam?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 4,
            helperText: "Verbas de fornecedores que precisam ser cobradas.",
            regraOportunidade: {
              id: "compras-op-q16",
              name: "Controlar bonificações e rebates",
              description: "Bonificações e rebates não controlados viram dinheiro perdido",
              type: "Receita incremental",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
        ],
      },
      // SEÇÃO 5: Pedido, Recebimento e Conferência (Peso: 15)
      {
        id: "compras-s5",
        title: "Pedido, Recebimento e Conferência",
        description: "Processos de recebimento e conferência de mercadorias.",
        order: 5,
        weight: 15,
        audit: { updatedAt: "19/12/2024" },
        questions: [
          {
            id: "compras-q17",
            title: "Existe dupla conferência no recebimento (quantidade e custo)?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Conferir quantidade física e valor da nota.",
            regraOportunidade: {
              id: "compras-op-q17",
              name: "Implementar dupla conferência",
              description: "Sem dupla conferência, paga-se nota errada e perde-se dinheiro em divergência",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q18",
            title: "Qual é o tempo médio entre recebimento e entrada no sistema?",
            type: "multiple_choice",
            weight: 2,
            criticality: "media",
            required: true,
            order: 2,
            options: ["Na hora", "No mesmo dia", "1 dia depois", "2 a 3 dias", "Mais de 3 dias"],
            helperText: "Entrada tardia distorce estoque.",
            regraOportunidade: {
              id: "compras-op-q18",
              name: "Acelerar entrada no sistema",
              description: "Entrada tardia distorce estoque e gera compras duplicadas e ruptura falsa",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "multiple_choice", matchingOptions: ["2 a 3 dias", "Mais de 3 dias"], matchStrategy: "any" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q19",
            title: "Existe processo claro para tratar divergência de nota (faltas, trocas, custo errado)?",
            type: "scale",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 3,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Não existe processo, 5 = Processo claro com prazos.",
            regraOportunidade: {
              id: "compras-op-q19",
              name: "Criar processo de divergência",
              description: "Divergências não tratadas viram perda financeira direta",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
        ],
      },
      // SEÇÃO 6: Custo Real, Impostos e Margem (Peso: 15)
      {
        id: "compras-s6",
        title: "Custo Real, Impostos e Margem",
        description: "Cálculo de custo real e monitoramento de margem.",
        order: 6,
        weight: 15,
        audit: { updatedAt: "19/12/2024" },
        questions: [
          {
            id: "compras-q20",
            title: "O custo considerado inclui frete, impostos e bonificações para chegar no custo real?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Custo real = custo nota + frete + impostos - bonificações.",
            regraOportunidade: {
              id: "compras-op-q20",
              name: "Calcular custo real",
              description: "Custo real mal calculado corrói margem e precificação",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q21",
            title: "Vocês têm monitoramento de variação de custo por item (semanal/mensal)?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Acompanhar se custos estão subindo ou caindo.",
            regraOportunidade: {
              id: "compras-op-q21",
              name: "Monitorar variação de custo",
              description: "Sem monitorar variação de custo, margem quebra sem perceber",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q22",
            title: "Existem itens com margem negativa ou muito baixa e isso é identificado rapidamente?",
            type: "scale",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 3,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Não sei quais itens, 5 = Tenho painel atualizado.",
            regraOportunidade: {
              id: "compras-op-q22",
              name: "Identificar margem negativa",
              description: "Falta de visibilidade de margem permite vender com prejuízo",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
        ],
      },
      // SEÇÃO 7: Caixa, Prazos e Condição de Pagamento (Peso: 10)
      {
        id: "compras-s7",
        title: "Caixa, Prazos e Condição de Pagamento",
        description: "Gestão de prazos de pagamento e impacto no caixa.",
        order: 7,
        weight: 10,
        audit: { updatedAt: "19/12/2024" },
        questions: [
          {
            id: "compras-q23",
            title: "As condições de pagamento são negociadas ativamente (prazo, desconto, parcelamento)?",
            type: "scale",
            weight: 2,
            criticality: "media",
            required: true,
            order: 1,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Aceito o que vem, 5 = Sempre negocio prazo.",
            regraOportunidade: {
              id: "compras-op-q23",
              name: "Negociar condições de pagamento",
              description: "Condição de pagamento ruim pressiona caixa e aumenta custo financeiro",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q24",
            title: "Existe calendário de vencimentos para evitar concentração de pagamentos?",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: false,
            order: 2,
            helperText: "Distribuir vencimentos ao longo do mês.",
            regraOportunidade: {
              id: "compras-op-q24",
              name: "Criar calendário de vencimentos",
              description: "Concentração de vencimentos gera aperto de caixa e risco de atraso",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
        ],
      },
      // SEÇÃO 8: Ferramentas, Rotina e Onboarding (Peso: 10)
      {
        id: "compras-s8",
        title: "Ferramentas, Rotina e Onboarding",
        description: "Rotinas de gestão e documentação do setor.",
        order: 8,
        weight: 10,
        audit: { updatedAt: "19/12/2024" },
        questions: [
          {
            id: "compras-q25",
            title: "Existe uma rotina semanal com relatório padrão de compras (itens críticos, variação de custo, rupturas, excessos)?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Ritual semanal com indicadores chave.",
            regraOportunidade: {
              id: "compras-op-q25",
              name: "Criar rotina semanal de compras",
              description: "Sem rotina semanal, compras vira reatividade e perde dinheiro",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q26",
            title: "Se você precisar treinar alguém novo, existe POP do setor de compras?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 2,
            helperText: "Procedimento Operacional Padrão documentado.",
            regraOportunidade: {
              id: "compras-op-q26",
              name: "Documentar POP de compras",
              description: "Sem POP, conhecimento fica na cabeça e vira gargalo",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "19/12/2024" },
            },
            audit: { updatedAt: "19/12/2024" },
          },
          {
            id: "compras-q27",
            title: "Quais são as 3 maiores dores do setor de compras hoje?",
            type: "text",
            weight: 1,
            criticality: "media",
            required: true,
            order: 3,
            helperText: "Descreva livremente os principais problemas.",
            placeholder: "Ex: Falta de tempo para cotar, sistema lento, fornecedores atrasam...",
            audit: { updatedAt: "19/12/2024" },
          },
        ],
      },
    ],
    questionCount: 27,
    sectionsCount: 8,
    estimatedTimeMinutes: 45,
    version: "v1.0",
    updatedAt: "19/12/2024",
    createdAt: "19/12/2024",
  },
  {
    id: "template-3",
    name: "Diagnóstico de Estoque",
    description: "Processos críticos de armazenagem e giro.",
    tags: ["Estoque", "Logística"],
    status: "published",
    sections: [
      {
        id: "estoque-1",
        title: "Operação",
        order: 1,
        weight: 1,
        audit: { updatedAt: "18/12/2024" },
        questions: [
          {
            id: "estoque-1-q1",
            title: "Inventário rotativo ativo?",
            type: "yes_no",
            weight: 1,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "18/12/2024" },
          },
          {
            id: "estoque-1-q2",
            title: "Acuracidade do estoque (%)",
            type: "number",
            weight: 1,
            criticality: "media",
            required: false,
            order: 2,
            minValue: 0,
            maxValue: 100,
            audit: { updatedAt: "18/12/2024" },
          },
        ],
      },
    ],
    questionCount: 2,
    sectionsCount: 1,
    estimatedTimeMinutes: 15,
    version: "v1.0",
    updatedAt: "18/12/2024",
    createdAt: "05/12/2024",
  },
  {
    id: "template-4",
    name: "Diagnóstico Financeiro",
    description: "Riscos, controles e performance financeira.",
    tags: ["Financeiro", "Riscos", "Controles"],
    status: "published",
    sections: [
      {
        id: "financeiro-1",
        title: "Controles",
        order: 1,
        weight: 1,
        audit: { updatedAt: "28/01/2025" },
        questions: [
          {
            id: "financeiro-1-q1",
            title: "Fechamento mensal ocorre em até 5 dias úteis?",
            type: "yes_no",
            weight: 1,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "28/01/2025" },
          },
          {
            id: "financeiro-1-q2",
            title: "% de conciliação bancária automatizada",
            type: "number",
            weight: 1,
            criticality: "media",
            required: false,
            order: 2,
            minValue: 0,
            maxValue: 100,
            audit: { updatedAt: "28/01/2025" },
          },
        ],
      },
      {
        id: "financeiro-2",
        title: "Riscos",
        order: 2,
        weight: 1,
        audit: { updatedAt: "28/01/2025" },
        questions: [
          {
            id: "financeiro-2-q1",
            title: "Existe matriz de riscos atualizada?",
            type: "yes_no",
            weight: 1,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "28/01/2025" },
          },
        ],
      },
    ],
    questionCount: 3,
    sectionsCount: 2,
    estimatedTimeMinutes: 30,
    version: "v1.1",
    updatedAt: "28/01/2025",
    createdAt: "14/01/2025",
  },
];

const diagnosticsSeed: Diagnostic[] = [
  {
    id: "diagnostic-1",
    name: defaultName("Operações SaaS", "Implantação BI Operacional", parseDatePtBR("22/01/2025") || new Date()),
    projectId: "project-1",
    projectName: "Implantação BI Operacional",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    templateId: "template-1",
    templateName: "Operações SaaS",
    status: "in_progress",
    progress: 55,
    score: undefined,
    opportunities: 7,
    createdAt: "22/01/2025",
    updatedAt: "12/02/2025",
    totalQuestions: 82,
    answeredQuestions: 45,
    autoGenerateOpportunities: true,
    responsibleName: "Marina Rocha",
    responsibleId: "employee-1",
    hasResponses: true,
    dueDate: "28/02/2025",
  },
  {
    id: "diagnostic-2",
    name: defaultName("Diagnóstico de Compras JoIA", "Expansão Marketplace", parseDatePtBR("10/02/2025") || new Date()),
    projectId: "project-2",
    projectName: "Expansão Marketplace",
    clientId: "client-2",
    clientName: "BetaLog Transportes",
    templateId: "template-2",
    templateName: "Diagnóstico de Compras JoIA",
    status: "draft",
    progress: 0,
    opportunities: 0,
    createdAt: "10/02/2025",
    updatedAt: "10/02/2025",
    totalQuestions: 27,
    answeredQuestions: 0,
    autoGenerateOpportunities: true,
    responsibleName: "Diego Carvalho",
    responsibleId: "employee-2",
    hasResponses: false,
    dueDate: "05/03/2025",
  },
  {
    id: "diagnostic-3",
    name: defaultName("Diagnóstico Financeiro", "PMO Transformação Financeira", parseDatePtBR("03/12/2024") || new Date()),
    projectId: "project-3",
    projectName: "PMO Transformação Financeira",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    templateId: "template-4",
    templateName: "Diagnóstico Financeiro",
    status: "completed",
    progress: 100,
    score: 82,
    opportunities: 12,
    createdAt: "03/12/2024",
    updatedAt: "20/12/2024",
    totalQuestions: 56,
    answeredQuestions: 56,
    autoGenerateOpportunities: false,
    responsibleName: "Marina Rocha",
    responsibleId: "employee-1",
    hasResponses: true,
    dueDate: "15/01/2025",
  },
];

export const getDiagnosticsSeed = () => diagnosticsSeed;
export const getTemplatesSeed = () => templateSeed;

export const calculateDaysSinceUpdate = (dateString?: string): number => {
  const parsed = parseDatePtBR(dateString);
  if (!parsed) return 0;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return differenceInCalendarDays(todayMidnight, parsed);
};

export const isDiagnosticStalled = (diagnostic: Diagnostic): boolean => {
  return diagnostic.status === "in_progress" && calculateDaysSinceUpdate(diagnostic.updatedAt) > 10;
};

export const calculatePendingQuestions = (diagnostic: Diagnostic): number => {
  return Math.max(0, (diagnostic.totalQuestions || 0) - (diagnostic.answeredQuestions || 0));
};

export const fetchDiagnostics = async (): Promise<Diagnostic[]> => {
  return diagnosticsSeed;
};

export const fetchTemplates = async (): Promise<DiagnosticTemplate[]> => {
  return templateSeed;
};

export const applyDiagnostic = async (input: ApplyDiagnosticInput): Promise<Diagnostic> => {
  const { templateName, projectName, templateQuestionCount } = input;
  const id = `diagnostic-${Math.random().toString(36).slice(2, 8)}`;
  const today = formatDatePtBR(new Date());
  const totalQuestions = templateQuestionCount ?? 40;

  return {
    id,
    name: input.name || defaultName(templateName, projectName),
    status: "in_progress",
    progress: 0,
    score: undefined,
    opportunities: 0,
    createdAt: today,
    updatedAt: today,
    answeredQuestions: 0,
    totalQuestions,
    hasResponses: false,
    autoGenerateOpportunities: input.autoGenerateOpportunities ?? true,
    responsibleName: input.responsibleName || "Equipe JoIA",
    responsibleId: input.responsibleId,
    dueDate: input.dueDate,
    ...input,
  };
};

export const updateDiagnostic = async (current: Diagnostic, payload: Partial<Diagnostic>): Promise<Diagnostic> => {
  return {
    ...current,
    ...payload,
    updatedAt: payload.updatedAt || formatDatePtBR(new Date()),
  };
};

export const createTemplateMock = (name?: string): DiagnosticTemplate => {
  const id = `template-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: name || "Template importado JoIA",
    description: "Template criado a partir de importação rápida.",
    tags: ["Exemplo", "Boas práticas"],
    status: "draft",
    sections: [
      {
        id: `${id}-section-1`,
        title: "Seção importada",
        description: "Perguntas importadas para revisão.",
        order: 1,
        weight: 1,
        audit: { updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }) },
        questions: [
          {
            id: `${id}-question-1`,
            title: "Pergunta de exemplo",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 1,
            audit: { updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }) },
          },
        ],
      },
    ],
    questionCount: 1,
    sectionsCount: 1,
    estimatedTimeMinutes: 15,
    version: "v1.0",
    lastPublishedAt: undefined,
    updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
    createdAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
  };
};

const parseVersion = (version?: string) => {
  const match = version?.match(/v?(\d+)(?:\.(\d+))?/i);
  const major = match?.[1] ? Number(match[1]) : 1;
  const minor = match?.[2] ? Number(match[2]) : 0;
  return { major: Number.isNaN(major) ? 1 : major, minor: Number.isNaN(minor) ? 0 : minor };
};

export const calculateNextTemplateVersion = (
  currentVersion: string | undefined,
  changeType: "minor" | "major"
): string => {
  const { major, minor } = parseVersion(currentVersion);
  if (changeType === "major") {
    return `v${major + 1}.0`;
  }
  return `v${major}.${minor + 1}`;
};

const normalizeCopyName = (name?: string) => {
  if (!name) return "Template (Cópia)";
  const cleaned = name.replace(/\s+\(C[oó]pia\)$/i, "");
  return `${cleaned} (Cópia)`;
};

export const buildDuplicatedTemplateDraft = (
  template: DiagnosticTemplate | (Omit<DiagnosticTemplate, "id"> & { id?: string })
): Omit<DiagnosticTemplate, "id"> & { id?: string } => {
  const today = formatDatePtBR(new Date());

  return {
    ...template,
    id: undefined,
    name: normalizeCopyName(template.name),
    status: "draft",
    version: "v1.0",
    revision: 1,
    lastPublishedAt: undefined,
    updatedAt: today,
    createdAt: today,
  };
};

export const resolveStatusLabel = (status: Status) => {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "in_progress":
      return "Em andamento";
    case "completed":
      return "Concluído";
    default:
      return status;
  }
};

export const formatRelativeUpdate = (diagnostic: Diagnostic): string => {
  const days = calculateDaysSinceUpdate(diagnostic.updatedAt);
  if (days <= 0) return "Atualizado hoje";
  if (days === 1) return "Atualizado há 1 dia";
  return `Atualizado há ${days} dias`;
};

export const getDefaultDiagnosticName = (templateName: string, projectName: string) =>
  defaultName(templateName, projectName, new Date());
