import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AuditMetadata,
  DiagnosticTemplate,
  DiagnosticTemplateStatus,
  Diagnostic,
  OpportunityRuleCondition,
  QuestionOption,
  TemplateOpportunityRule,
  TemplateQuestion,
  TemplateSection,
} from "@/types";
import { formatDatePtBR, parseDatePtBR } from "@/lib/dates";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PostgrestError } from "@supabase/supabase-js";

// Cliente "untyped" para tabelas de templates que ainda não existem no schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedSupabase = supabase as any;

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
    description: "Diagnóstico completo do setor de compras para identificar oportunidades financeiras, melhorar negociação, reduzir ruptura, excesso e retrabalho.",
    tags: ["Compras", "Estoque", "Margem", "Fornecedores", "Processos", "Caixa"],
    status: "published",
    sections: [
      // SEÇÃO 1 — Governança e Fluxo de Compras (Peso: 15)
      {
        id: "compras-s1",
        title: "Governança e Fluxo de Compras",
        description: "Estrutura de fluxos, alçadas e aprovações de compras.",
        order: 1,
        weight: 15,
        audit: { updatedAt: "27/12/2024" },
        questions: [
          {
            id: "compras-q1",
            title: "Existe um fluxo formal para solicitação de compras (quem solicita, como solicita e quem aprova)?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Fluxo documentado com responsáveis e prazos definidos.",
            regraOportunidade: {
              id: "compras-op-q1",
              name: "Ausência de fluxo formal de compras",
              description: "Criar fluxo simples de solicitação e aprovação por valor",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q2",
            title: "Existe regra clara de aprovação por valor (alçadas)?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Ex: até R$500 sem aprovação, R$500-2000 gestor, acima diretoria.",
            regraOportunidade: {
              id: "compras-op-q2",
              name: "Compras sem alçada definida",
              description: "Definir alçadas mínimas por faixa de valor",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
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
              name: "Alto volume de compras urgentes",
              description: "Criar rotina semanal de planejamento de compras",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 3 },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
        ],
      },
      // SEÇÃO 2 — Planejamento de Compra e Demanda (Peso: 20)
      {
        id: "compras-s2",
        title: "Planejamento de Compra e Demanda",
        description: "Como a empresa planeja suas compras com base em dados.",
        order: 2,
        weight: 20,
        audit: { updatedAt: "27/12/2024" },
        questions: [
          {
            id: "compras-q4",
            title: "As compras são baseadas em histórico de vendas e giro de estoque?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Usar dados para decidir o que e quanto comprar.",
            regraOportunidade: {
              id: "compras-op-q4",
              name: "Compras sem base em giro",
              description: "Criar relatório de giro e sugestão de compra",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q5",
            title: "Existe definição de estoque mínimo e máximo?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Parâmetros que guiam quando e quanto repor.",
            regraOportunidade: {
              id: "compras-op-q5",
              name: "Estoque sem parâmetros mínimos e máximos",
              description: "Definir mínimo e máximo para itens A",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q6",
            title: "Quantas rupturas de itens críticos ocorrem por semana?",
            type: "number",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 3,
            minValue: 0,
            helperText: "Itens que faltaram e causaram perda de venda.",
            regraOportunidade: {
              id: "compras-op-q6",
              name: "Ruptura recorrente",
              description: "Criar lista de itens críticos e rotina de reposição",
              type: "Receita incremental",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 3 },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
        ],
      },
      // SEÇÃO 3 — Cadastro, Portfólio e Curva ABC (Peso: 15)
      {
        id: "compras-s3",
        title: "Cadastro, Portfólio e Curva ABC",
        description: "Qualidade do cadastro e uso da Curva ABC.",
        order: 3,
        weight: 15,
        audit: { updatedAt: "27/12/2024" },
        questions: [
          {
            id: "compras-q7",
            title: "Existe padronização no cadastro de produtos?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Cadastro consistente para evitar duplicidades.",
            regraOportunidade: {
              id: "compras-op-q7",
              name: "Cadastro inconsistente",
              description: "Padronizar cadastro de produtos",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q8",
            title: "Existem produtos duplicados no cadastro?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Ex: 'Coca 2L' e 'Coca-Cola 2 litros' no mesmo sistema.",
            regraOportunidade: {
              id: "compras-op-q8",
              name: "Produtos duplicados distorcendo análises",
              description: "Higienizar e unificar SKUs duplicados",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "yes" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q9",
            title: "Existe Curva ABC atualizada?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 3,
            helperText: "Classificação de itens por faturamento/margem.",
            regraOportunidade: {
              id: "compras-op-q9",
              name: "Ausência de Curva ABC",
              description: "Gerar Curva ABC por faturamento e margem",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
        ],
      },
      // SEÇÃO 4 — Fornecedores e Negociação (Peso: 20)
      {
        id: "compras-s4",
        title: "Fornecedores e Negociação",
        description: "Gestão de fornecedores, cotação e negociação.",
        order: 4,
        weight: 20,
        audit: { updatedAt: "27/12/2024" },
        questions: [
          {
            id: "compras-q10",
            title: "As condições de fornecedores (preço, prazo, frete, bonificação) estão registradas?",
            type: "scale",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Nada registrado, 5 = Tudo controlado em sistema.",
            regraOportunidade: {
              id: "compras-op-q10",
              name: "Condições de fornecedor não controladas",
              description: "Criar tabela viva de fornecedores",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q11",
            title: "Vocês realizam cotação com mais de um fornecedor?",
            type: "multiple_choice",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            options: ["Sempre", "Frequentemente", "Raramente", "Nunca"],
            helperText: "Cotação competitiva reduz custo e melhora condições.",
            regraOportunidade: {
              id: "compras-op-q11",
              name: "Falta de concorrência na compra",
              description: "Implantar regra mínima de cotação",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Raramente", "Nunca"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q12",
            title: "Existe controle de reajustes e contestação de preços?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 3,
            helperText: "Monitoramento de variação de preços de fornecedores.",
            regraOportunidade: {
              id: "compras-op-q12",
              name: "Margem corroída por reajustes automáticos",
              description: "Criar relatório de variação de custo",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
        ],
      },
      // SEÇÃO 5 — Pedido, Recebimento e Conferência (Peso: 15)
      {
        id: "compras-s5",
        title: "Pedido, Recebimento e Conferência",
        description: "Processos de pedido, recebimento e conferência de mercadorias.",
        order: 5,
        weight: 15,
        audit: { updatedAt: "27/12/2024" },
        questions: [
          {
            id: "compras-q13",
            title: "Existe dupla conferência no recebimento (quantidade e custo)?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Conferência de quantidade física e valores da nota.",
            regraOportunidade: {
              id: "compras-op-q13",
              name: "Pagamento incorreto de notas",
              description: "Criar checklist de conferência",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q14",
            title: "Quanto tempo leva para dar entrada do produto no sistema após o recebimento?",
            type: "multiple_choice",
            weight: 2,
            criticality: "media",
            required: true,
            order: 2,
            options: ["Na hora", "No mesmo dia", "1 dia", "Mais de 1 dia"],
            helperText: "Entrada tardia distorce estoque e vendas.",
            regraOportunidade: {
              id: "compras-op-q14",
              name: "Entrada tardia distorce estoque",
              description: "Padronizar entrada no mesmo dia",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Mais de 1 dia"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
        ],
      },
      // SEÇÃO 6 — Custo Real e Margem (Peso: 15)
      {
        id: "compras-s6",
        title: "Custo Real e Margem",
        description: "Composição de custo e monitoramento de margem.",
        order: 6,
        weight: 15,
        audit: { updatedAt: "27/12/2024" },
        questions: [
          {
            id: "compras-q15",
            title: "O custo considerado inclui frete, impostos e bonificações?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Custo real deve incluir todos os componentes.",
            regraOportunidade: {
              id: "compras-op-q15",
              name: "Custo real incorreto",
              description: "Padronizar composição de custo",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
          {
            id: "compras-q16",
            title: "Existe monitoramento de variação de custo por item?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Acompanhar variação de custo para proteger margem.",
            regraOportunidade: {
              id: "compras-op-q16",
              name: "Margem quebrando sem visibilidade",
              description: "Criar relatório mensal de variação de custo",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "27/12/2024" },
            },
            audit: { updatedAt: "27/12/2024" },
          },
        ],
      },
    ],
    questionCount: 16,
    sectionsCount: 6,
    estimatedTimeMinutes: 45,
    version: "v1.0",
    updatedAt: "27/12/2024",
    createdAt: "27/12/2024",
  },
  {
    id: "template-3",
    name: "Diagnóstico de Estoque JoIA",
    description: "Avalia governança, acuracidade e giro do estoque para reduzir ruptura e excesso.",
    tags: ["Estoque", "Logística", "Operação", "Compras"],
    status: "published",
    sections: [
      {
        id: "estoque-s1",
        title: "Governança e Políticas de Estoque",
        description: "Responsáveis, regras e política de estoque de segurança.",
        order: 1,
        weight: 15,
        audit: { updatedAt: "05/03/2025" },
        questions: [
          {
            id: "estoque-q1",
            title: "Existe política formal de estoque de segurança por categoria?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Documenta parâmetros mínimos por curva ABC ou criticidade.",
            regraOportunidade: {
              id: "estoque-op-q1",
              name: "Definir política de estoque de segurança",
              description: "Sem política formal, o risco de ruptura e excesso aumenta.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q2",
            title: "Fluxo de entrada e baixa de estoque tem responsáveis e aprovadores definidos?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Quem recebe não é quem aprova ou concilia a baixa.",
            regraOportunidade: {
              id: "estoque-op-q2",
              name: "Segregar funções na movimentação de estoque",
              description: "Movimentações sem responsáveis definidos elevam risco de perdas e fraude.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q3",
            title: "Catálogo de SKUs ativos é revisado com que frequência?",
            type: "multiple_choice",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            options: ["Mensal", "Trimestral", "Semestral", "Nunca formalizei"],
            helperText: "Limpeza de catálogo reduz obsolescência e complexidade.",
            regraOportunidade: {
              id: "estoque-op-q3",
              name: "Implantar revisão periódica de catálogo",
              description: "Sem revisão frequente, itens mortos ocupam espaço e capital.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Semestral", "Nunca formalizei"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q4",
            title: "Existe proprietário claro do estoque (acuracidade e perdas)?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            helperText: "Um responsável acompanha indicadores e planos de ação.",
            regraOportunidade: {
              id: "estoque-op-q4",
              name: "Designar ownership do estoque",
              description: "Sem dono claro, desvios e avarias ficam sem plano de ação.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q5",
            title: "% dos SKUs críticos com estoque mínimo definido",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            minValue: 0,
            maxValue: 100,
            helperText: "Considere itens A/alta criticidade.",
            regraOportunidade: {
              id: "estoque-op-q5",
              name: "Parametrizar mínimos para SKUs críticos",
              description: "Sem mínimos claros, aumenta o risco de ruptura em itens A.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: "<=", value: 70 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
        ],
      },
      {
        id: "estoque-s2",
        title: "Planejamento e Demanda",
        description: "Forecast, cobertura e alinhamento com compras/vendas.",
        order: 2,
        weight: 20,
        audit: { updatedAt: "05/03/2025" },
        questions: [
          {
            id: "estoque-q6",
            title: "Há previsão de demanda alinhada com vendas e compras?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Forecast revisado ao menos mensalmente.",
            regraOportunidade: {
              id: "estoque-op-q6",
              name: "Implantar forecast integrado",
              description: "Sem previsão integrada, há ruptura e excesso recorrentes.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q7",
            title: "Acuracidade do forecast (%) nos últimos 3 meses",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 2,
            minValue: 0,
            maxValue: 100,
            helperText: "Compare previsão x realizado por família.",
            regraOportunidade: {
              id: "estoque-op-q7",
              name: "Ajustar modelo de previsão",
              description: "Baixa acuracidade gera ruptura e capital parado.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: "<=", value: 70 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q8",
            title: "Lead time médio de fornecedores (dias)",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            minValue: 0,
            helperText: "Considere do pedido à entrega disponível.",
            regraOportunidade: {
              id: "estoque-op-q8",
              name: "Reduzir lead time de fornecimento",
              description: "Lead times altos pedem mais estoque e imobilizam capital.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 15 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q9",
            title: "% dos pedidos de compra entregues com atraso nos últimos 30 dias",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            minValue: 0,
            maxValue: 100,
            helperText: "Atraso inclui entregas parciais.",
            regraOportunidade: {
              id: "estoque-op-q9",
              name: "Controlar atrasos de fornecedores",
              description: "Atrasos constantes quebram o plano de reposição.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 10 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q10",
            title: "Existe rotina de S&OP/SIOP para reconciliar demanda, compras e capacidade?",
            type: "multiple_choice",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 5,
            options: ["Sim, semanal", "Sim, mensal", "Só quando há problema", "Não existe"],
            helperText: "Inclui vendas, compras, logística e finanças.",
            regraOportunidade: {
              id: "estoque-op-q10",
              name: "Instituir rotina de S&OP",
              description: "Sem S&OP, a operação fica reativa e o estoque oscila demais.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Só quando há problema", "Não existe"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
        ],
      },
      {
        id: "estoque-s3",
        title: "Armazenagem e Endereçamento",
        description: "Layout, endereçamento e produtividade de separação.",
        order: 3,
        weight: 15,
        audit: { updatedAt: "05/03/2025" },
        questions: [
          {
            id: "estoque-q11",
            title: "Depósito possui endereçamento e mapa atualizado (zonas ABC)?",
            type: "yes_no",
            weight: 3,
            criticality: "media",
            required: true,
            order: 1,
            helperText: "Mapeamento reduz deslocamento e erros de separação.",
            regraOportunidade: {
              id: "estoque-op-q11",
              name: "Implementar endereçamento estruturado",
              description: "Sem endereçamento, há mais erros, acidentes e demora na separação.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q12",
            title: "% dos SKUs com código de barras/RFID lido na operação",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 2,
            minValue: 0,
            maxValue: 100,
            helperText: "Inclui recebimento, movimentação e expedição.",
            regraOportunidade: {
              id: "estoque-op-q12",
              name: "Massificar uso de código de barras/RFID",
              description: "Sem rastreabilidade por leitura, aumentam divergências e retrabalho.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: "<=", value: 80 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q13",
            title: "Tempo médio para separar um pedido padrão",
            type: "multiple_choice",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            options: ["< 15 min", "15-30 min", "31-45 min", "> 45 min"],
            helperText: "Considerar pedido de complexidade média.",
            regraOportunidade: {
              id: "estoque-op-q13",
              name: "Reduzir tempo de separação",
              description: "Tempos altos indicam layout ruim ou falta de endereçamento.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["31-45 min", "> 45 min"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q14",
            title: "% de pedidos separados com divergência no último mês",
            type: "number",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 4,
            minValue: 0,
            maxValue: 100,
            helperText: "Inclui diferença de quantidade ou item incorreto.",
            regraOportunidade: {
              id: "estoque-op-q14",
              name: "Reduzir divergências na separação",
              description: "Erros de picking geram devoluções, perdas e frete adicional.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 3 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q15",
            title: "Existe área de quarentena para itens avariados ou suspeitos?",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 5,
            helperText: "Itens não conformes ficam segregados até decisão.",
            regraOportunidade: {
              id: "estoque-op-q15",
              name: "Criar fluxo de quarentena",
              description: "Sem quarentena, itens avariados podem ser reenviados ao cliente ou inventário.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
        ],
      },
      {
        id: "estoque-s4",
        title: "Controle e Inventário",
        description: "Inventário rotativo, ajustes e auditoria de movimentações.",
        order: 4,
        weight: 20,
        audit: { updatedAt: "05/03/2025" },
        questions: [
          {
            id: "estoque-q16",
            title: "Inventário rotativo é executado com qual frequência?",
            type: "multiple_choice",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            options: ["Diária", "Semanal", "Mensal", "Só inventário anual"],
            helperText: "Rotação alta reduz surpresas em inventário geral.",
            regraOportunidade: {
              id: "estoque-op-q16",
              name: "Instituir inventário rotativo",
              description: "Sem contagens frequentes, acuracidade cai rapidamente.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Só inventário anual"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q17",
            title: "Acuracidade do último inventário (%)",
            type: "number",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            minValue: 0,
            maxValue: 100,
            helperText: "Comparar contagem física x sistema.",
            regraOportunidade: {
              id: "estoque-op-q17",
              name: "Plano para elevar acuracidade",
              description: "Acuracidade baixa indica falha de processos e controles.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: "<=", value: 95 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q18",
            title: "% de ajustes de estoque realizados no último mês",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            minValue: 0,
            maxValue: 100,
            helperText: "Ajustes manuais recorrentes indicam falha de processo.",
            regraOportunidade: {
              id: "estoque-op-q18",
              name: "Reduzir ajustes recorrentes",
              description: "Muitos ajustes mascaram erros de movimentação e recebimento.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 3 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q19",
            title: "Tempo para registrar entrada de NF após recebimento (horas)",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            minValue: 0,
            helperText: "Considerar do recebimento físico até o lançamento no sistema.",
            regraOportunidade: {
              id: "estoque-op-q19",
              name: "Acelerar registro de entradas",
              description: "Registro tardio distorce saldo, gera ruptura falsa e compras duplicadas.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 24 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q20",
            title: "Existe trilha de auditoria das movimentações de estoque?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            helperText: "Sistema registra quem movimenta, quando e motivo.",
            regraOportunidade: {
              id: "estoque-op-q20",
              name: "Ativar logs de movimentação",
              description: "Sem rastreabilidade, desvios ficam invisíveis.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
        ],
      },
      {
        id: "estoque-s5",
        title: "Reposição e Giro",
        description: "Cobertura, ruptura e velocidade de reposição interna.",
        order: 5,
        weight: 15,
        audit: { updatedAt: "05/03/2025" },
        questions: [
          {
            id: "estoque-q21",
            title: "Cálculo de ponto de pedido/reposição é automatizado no sistema?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Parametrização automática reduz decisões manuais.",
            regraOportunidade: {
              id: "estoque-op-q21",
              name: "Automatizar ponto de pedido",
              description: "Sem automatização, decisões reativas aumentam ruptura e excesso.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q22",
            title: "% de itens com cobertura > 90 dias (excesso)",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 2,
            minValue: 0,
            maxValue: 100,
            helperText: "Considere estoque disponível dividido pelo consumo médio diário.",
            regraOportunidade: {
              id: "estoque-op-q22",
              name: "Reduzir excesso de cobertura",
              description: "Estoque parado imobiliza capital e aumenta risco de obsolescência.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 10 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q23",
            title: "% de itens com ruptura nas últimas 4 semanas",
            type: "number",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 3,
            minValue: 0,
            maxValue: 100,
            helperText: "Considerar itens que ficaram indisponíveis.",
            regraOportunidade: {
              id: "estoque-op-q23",
              name: "Reduzir rupturas",
              description: "Ruptura impacta vendas, NPS e gera custos emergenciais.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 5 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q24",
            title: "Dias médios de cobertura para itens A",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            minValue: 0,
            helperText: "Cobertura alta demais indica capital parado.",
            regraOportunidade: {
              id: "estoque-op-q24",
              name: "Recalibrar cobertura dos itens A",
              description: "Cobertura excessiva de itens A reduz giro e aperta caixa.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 60 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q25",
            title: "Tempo médio interno entre solicitar reposição e item disponível (dias)",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            minValue: 0,
            helperText: "Inclui aprovação, recebimento e endereçamento.",
            regraOportunidade: {
              id: "estoque-op-q25",
              name: "Encurtar lead time interno",
              description: "Lead time longo consome mais estoque de segurança e aumenta ruptura.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 5 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
        ],
      },
      {
        id: "estoque-s6",
        title: "Indicadores e Tecnologia",
        description: "Painéis, integrações e disciplina de cadastros.",
        order: 6,
        weight: 15,
        audit: { updatedAt: "05/03/2025" },
        questions: [
          {
            id: "estoque-q26",
            title: "Painel de indicadores (ruptura, excesso, giro) é atualizado semanalmente?",
            type: "yes_no",
            weight: 3,
            criticality: "media",
            required: true,
            order: 1,
            helperText: "Painéis visíveis suportam priorização e rotina semanal.",
            regraOportunidade: {
              id: "estoque-op-q26",
              name: "Criar painel de estoque",
              description: "Sem painel, decisões são reativas e pouco orientadas a dados.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q27",
            title: "WMS está integrado ao ERP/compras para baixar e dar entrada automaticamente?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Integração reduz lançamentos manuais e divergências.",
            regraOportunidade: {
              id: "estoque-op-q27",
              name: "Integrar WMS e ERP",
              description: "Sem integração, há retrabalho e dados defasados para decisão.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q28",
            title: "% de pedidos atendidos dentro do SLA de expedição",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            minValue: 0,
            maxValue: 100,
            helperText: "Considere prazo prometido ao cliente ou operação.",
            regraOportunidade: {
              id: "estoque-op-q28",
              name: "Melhorar cumprimento de SLA de expedição",
              description: "Atrasos na expedição geram cancelamentos e fretes extras.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: "<=", value: 94 },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q29",
            title: "Checklist de recebimento inclui fotos, lote e validade (quando aplicável)?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            helperText: "Documentação evita perdas por validade e contestação de avarias.",
            regraOportunidade: {
              id: "estoque-op-q29",
              name: "Padronizar checklist de recebimento",
              description: "Sem checklist robusto, aumenta divergência com fornecedor e perdas.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
          {
            id: "estoque-q30",
            title: "Parâmetros de cadastro (lead time, lotes mínimos, endereços) são revisados periodicamente?",
            type: "multiple_choice",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            options: ["Mensal", "Trimestral", "Semestral", "Nunca revisei"],
            helperText: "Revisão garante consistência com operação real.",
            regraOportunidade: {
              id: "estoque-op-q30",
              name: "Criar rotina de revisão de cadastros",
              description: "Parâmetros desatualizados geram cálculo errado de reposição e divergências.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Semestral", "Nunca revisei"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "05/03/2025" },
            },
            audit: { updatedAt: "05/03/2025" },
          },
        ],
      },
    ],
    questionCount: 30,
    sectionsCount: 6,
    estimatedTimeMinutes: 55,
    version: "v1.0",
    updatedAt: "05/03/2025",
    createdAt: "05/03/2025",
  },
  {
    id: "template-operacoes",
    name: "Diagnóstico de Operações JoIA",
    description: "Avalia governança, capacidade, qualidade e tecnologia da operação para reduzir atrasos e retrabalho.",
    tags: ["Operações", "SLA", "Qualidade", "Processos", "Tecnologia"],
    status: "published",
    sections: [
      {
        id: "operacoes-s1",
        title: "Governança e Rotina",
        description: "Rituais, papéis e visibilidade do trabalho.",
        order: 1,
        weight: 18,
        audit: { updatedAt: "15/03/2025" },
        questions: [
          {
            id: "operacoes-q1",
            title: "Existe um comitê operacional semanal com pauta e decisões registradas?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Inclui acompanhamento de SLAs, riscos e capacidade.",
            regraOportunidade: {
              id: "operacoes-op-q1",
              name: "Instituir comitê operacional",
              description: "Sem fórum recorrente, problemas se acumulam e decisões atrasam.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q2",
            title: "Processos críticos possuem POPs/documentação atualizada?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Ex: recebimento, produção, atendimento, reversa.",
            regraOportunidade: {
              id: "operacoes-op-q2",
              name: "Documentar POPs operacionais",
              description: "Ausência de POP aumenta tempo de treinamento e retrabalho.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q3",
            title: "Reuniões diárias (daily/turno) acontecem com duração controlada?",
            type: "multiple_choice",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            options: ["Diária (<=15min)", "3-4x por semana", "Semanal", "Não fazemos"],
            helperText: "Daily rápida para priorizar, remover impedimentos e reforçar segurança.",
            regraOportunidade: {
              id: "operacoes-op-q3",
              name: "Implementar rotina diária de operação",
              description: "Sem cadência curta, desvios demoram a ser percebidos.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Semanal", "Não fazemos"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q4",
            title: "% de processos críticos com SLA definido e divulgado",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            minValue: 0,
            maxValue: 100,
            helperText: "Considere processos fim-a-fim e SLAs acordados com clientes internos.",
            regraOportunidade: {
              id: "operacoes-op-q4",
              name: "Definir SLAs para processos críticos",
              description: "Sem SLAs claros, times priorizam por urgência e aumentam filas ocultas.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: "<=", value: 60 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q5",
            title: "Existe painel de capacidade/produção atualizado diariamente?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            helperText: "Mostra backlog, throughput e gargalos do dia.",
            regraOportunidade: {
              id: "operacoes-op-q5",
              name: "Publicar painel operacional diário",
              description: "Sem visibilidade de capacidade, decisões são baseadas em percepção e não em dados.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
        ],
      },
      {
        id: "operacoes-s2",
        title: "Planejamento, SLA e Fluxo",
        description: "Balanceamento de demanda, capacidade e prazos.",
        order: 2,
        weight: 20,
        audit: { updatedAt: "15/03/2025" },
        questions: [
          {
            id: "operacoes-q6",
            title: "Existe previsão de demanda/dia ou por turno para os próximos 4-8 semanas?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Considerar sazonalidade, campanhas e manutenção programada.",
            regraOportunidade: {
              id: "operacoes-op-q6",
              name: "Implantar forecast operacional",
              description: "Sem previsão, faltam recursos em picos e sobra capacidade em vales.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q7",
            title: "% de pedidos/ordens atrasadas na última semana",
            type: "number",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            minValue: 0,
            maxValue: 100,
            helperText: "Pedidos entregues além do SLA combinado.",
            regraOportunidade: {
              id: "operacoes-op-q7",
              name: "Reduzir atraso de pedidos",
              description: "Atrasos recorrentes impactam NPS e custos extras (reenvio, hora extra).",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 10 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q8",
            title: "% de retrabalho (reprocesso ou reenvio) no último mês",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            minValue: 0,
            maxValue: 100,
            helperText: "Retrabalho consome capacidade e indica falha de qualidade.",
            regraOportunidade: {
              id: "operacoes-op-q8",
              name: "Reduzir retrabalho",
              description: "Taxa de retrabalho acima do limite consome margem e equipe.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 8 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q9",
            title: "Capacidade planejada cobre a demanda prevista?",
            type: "scale",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Sempre estoura, 5 = Capacidade balanceada com folga controlada.",
            regraOportunidade: {
              id: "operacoes-op-q9",
              name: "Ajustar balanceamento capacidade x demanda",
              description: "Desequilíbrio gera atraso e hora extra ou ociosidade.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q10",
            title: "Tempo médio do ciclo fim-a-fim (pedido até conclusão) em dias",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            minValue: 0,
            helperText: "Considere do pedido à entrega/ativação.",
            regraOportunidade: {
              id: "operacoes-op-q10",
              name: "Reduzir lead time operacional",
              description: "Lead time alto prejudica experiência e aumenta WIP.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 7 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
        ],
      },
      {
        id: "operacoes-s3",
        title: "Qualidade e Melhoria Contínua",
        description: "Controles para evitar falhas, capturar erros e evoluir processos.",
        order: 3,
        weight: 18,
        audit: { updatedAt: "15/03/2025" },
        questions: [
          {
            id: "operacoes-q11",
            title: "Indicadores de qualidade (ex: NPS, CSAT, defeitos) são medidos semanalmente?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Coletar feedback e defeitos com rotina de análise.",
            regraOportunidade: {
              id: "operacoes-op-q11",
              name: "Implantar medição de qualidade",
              description: "Sem medir qualidade, não é possível priorizar correções.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q12",
            title: "Checklists de inspeção são utilizados nas etapas críticas?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 2,
            helperText: "Ex: antes de expedição, após manutenção, antes de liberação.",
            regraOportunidade: {
              id: "operacoes-op-q12",
              name: "Padronizar checklists",
              description: "Sem checklists, variações individuais aumentam defeitos e retrabalho.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q13",
            title: "% de incidentes reabertos ou reincidentes no último trimestre",
            type: "number",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 3,
            minValue: 0,
            maxValue: 100,
            helperText: "Considerar chamados reabertos ou falhas repetidas.",
            regraOportunidade: {
              id: "operacoes-op-q13",
              name: "Reduzir reincidência de incidentes",
              description: "Incidentes repetidos indicam causa raiz não resolvida.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 15 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q14",
            title: "Análises de causa raiz (RCA) são realizadas com que frequência?",
            type: "multiple_choice",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            options: ["Semanal", "Mensal", "Ad-hoc", "Não fazemos"],
            helperText: "RCA estruturada com plano de ação e responsável.",
            regraOportunidade: {
              id: "operacoes-op-q14",
              name: "Instituir rotina de RCA",
              description: "Sem RCA recorrente, causas raiz continuam abertas.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Ad-hoc", "Não fazemos"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q15",
            title: "Alarmes/monitoramento automático para eventos críticos está configurado?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            helperText: "Ex: pico de filas, máquinas paradas, níveis de estoque críticos.",
            regraOportunidade: {
              id: "operacoes-op-q15",
              name: "Automatizar alarmes operacionais",
              description: "Sem alertas, incidentes críticos são percebidos tarde demais.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
        ],
      },
      {
        id: "operacoes-s4",
        title: "Pessoas e Turnos",
        description: "Dimensionamento, treinamento e continuidade operacional.",
        order: 4,
        weight: 15,
        audit: { updatedAt: "15/03/2025" },
        questions: [
          {
            id: "operacoes-q16",
            title: "Dimensionamento da equipe por turno cobre a demanda média?",
            type: "scale",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Faltam pessoas com frequência, 5 = Dimensionado com folga planejada.",
            regraOportunidade: {
              id: "operacoes-op-q16",
              name: "Rever dimensionamento de turnos",
              description: "Equipe subdimensionada causa atrasos e risco de acidentes.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q17",
            title: "Turnover médio do time operacional nos últimos 12 meses (%)",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 2,
            minValue: 0,
            maxValue: 100,
            helperText: "Inclua desligamentos voluntários e involuntários.",
            regraOportunidade: {
              id: "operacoes-op-q17",
              name: "Reduzir turnover operacional",
              description: "Rotatividade alta aumenta custo de treinamento e perda de conhecimento.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 20 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q18",
            title: "Novo colaborador recebe onboarding padronizado antes de operar solo?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            helperText: "Inclui segurança, qualidade e ferramentas.",
            regraOportunidade: {
              id: "operacoes-op-q18",
              name: "Estruturar onboarding operacional",
              description: "Sem onboarding, curva de aprendizado é longa e propensa a erros.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q19",
            title: "% das posições críticas com back-up treinado",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            minValue: 0,
            maxValue: 100,
            helperText: "Substitutos prontos para férias ou afastamentos.",
            regraOportunidade: {
              id: "operacoes-op-q19",
              name: "Criar plano de sucessão operacional",
              description: "Sem backup, ausências paralisam etapas críticas.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: "<=", value: 60 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q20",
            title: "Adesão aos treinamentos obrigatórios nos últimos 3 meses (%)",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            minValue: 0,
            maxValue: 100,
            helperText: "Considere treinamentos de segurança, qualidade e ferramentas.",
            regraOportunidade: {
              id: "operacoes-op-q20",
              name: "Aumentar adesão a treinamentos",
              description: "Baixa adesão eleva risco de acidentes e erros básicos.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: "<=", value: 80 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
        ],
      },
      {
        id: "operacoes-s5",
        title: "Tecnologia e Integrações",
        description: "Sistemas, automações e confiabilidade da operação.",
        order: 5,
        weight: 15,
        audit: { updatedAt: "15/03/2025" },
        questions: [
          {
            id: "operacoes-q21",
            title: "Existe sistema único para registrar e acompanhar o fluxo principal?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 1,
            helperText: "Evitar controles paralelos em planilhas para etapas críticas.",
            regraOportunidade: {
              id: "operacoes-op-q21",
              name: "Consolidar sistema operacional",
              description: "Múltiplos controles aumentam erros de digitação e falta de rastreabilidade.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q22",
            title: "Sistema está integrado ao ERP/CRM para evitar retrabalho manual?",
            type: "yes_no",
            weight: 3,
            criticality: "alta",
            required: true,
            order: 2,
            helperText: "Inclui pedidos, estoque, faturamento ou ordens de serviço.",
            regraOportunidade: {
              id: "operacoes-op-q22",
              name: "Automatizar integrações críticas",
              description: "Integração ausente gera digitação duplicada e erros de saldo.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q23",
            title: "Existe monitoração em tempo real para indisponibilidade ou lentidão de sistemas?",
            type: "yes_no",
            weight: 2,
            criticality: "media",
            required: true,
            order: 3,
            helperText: "Alarmes automáticos para quedas, filas ou erros críticos.",
            regraOportunidade: {
              id: "operacoes-op-q23",
              name: "Habilitar monitoração em tempo real",
              description: "Sem monitoração, incidentes são percebidos pelos clientes primeiro.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q24",
            title: "Backlog de automações/melhorias é priorizado e estimado mensalmente?",
            type: "scale",
            weight: 2,
            criticality: "media",
            required: true,
            order: 4,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Não existe backlog, 5 = Revisão mensal com priorização por impacto.",
            regraOportunidade: {
              id: "operacoes-op-q24",
              name: "Priorizar backlog de melhorias",
              description: "Sem priorização, automações críticas ficam sempre para depois.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
          {
            id: "operacoes-q25",
            title: "Tempo médio de indisponibilidade de sistemas críticos no último mês (horas)",
            type: "number",
            weight: 2,
            criticality: "media",
            required: true,
            order: 5,
            minValue: 0,
            helperText: "Soma de interrupções que afetaram a operação.",
            regraOportunidade: {
              id: "operacoes-op-q25",
              name: "Reduzir indisponibilidade de sistemas",
              description: "Indisponibilidade recorrente paralisa a operação e afeta SLA.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "upload",
              enabled: true,
              autoGenerate: true,
              condition: { type: "number", operator: ">=", value: 4 },
              audit: { updatedAt: "15/03/2025" },
            },
            audit: { updatedAt: "15/03/2025" },
          },
        ],
      },
    ],
    questionCount: 25,
    sectionsCount: 5,
    estimatedTimeMinutes: 45,
    version: "v1.0",
    updatedAt: "15/03/2025",
    createdAt: "15/03/2025",
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
  {
    id: "template-5",
    name: "Kickoff JoIA | Norte do Projeto",
    description:
      "Template de kickoff para entender a situação atual da empresa, definir objetivos, métricas, escopo, riscos, disponibilidade de dados e alvos de “dinheiro na mesa”. Regras: várias perguntas aceitam “não sei”/“a confirmar” e devem virar pendências de informação. Sempre que um problema crítico aparecer, gerar oportunidade do tipo Processos/Tecnologia/Financeiro com sugestão de ação inicial. Ao concluir o kickoff, gerar relatório com resumo executivo (5 linhas), top 5 prioridades (impacto x esforço), pendências, riscos/restrições e hipóteses de dinheiro na mesa. Incluir botão “Criar tarefas iniciais” para oportunidades de severidade alta.",
    tags: ["Kickoff", "Estratégia", "Gestão", "Diagnóstico Inicial"],
    status: "published",
    sections: [
      {
        id: "kickoff-s1",
        title: "Contexto do Negócio e Objetivo",
        description: "Direção e foco dos próximos 90 dias.",
        order: 1,
        weight: 15,
        audit: { updatedAt: "20/03/2025" },
        questions: [
          {
            id: "kickoff-q1",
            title: "Qual é o objetivo principal da empresa para os próximos 90 dias?",
            type: "text",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q2",
            title: "Qual é o maior problema hoje que tira o sono do dono/gestor?",
            type: "text",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            regraOportunidade: {
              id: "kickoff-op-q2",
              name: "Organizar dor principal",
              description:
                "Problema crítico não estruturado: organizar plano de ação para dor principal. Sugestão: transformar a dor em 3 hipóteses, evidências e 5 ações iniciais.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "always" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q3",
            title: "Quais são os 3 produtos/serviços que mais sustentam o faturamento hoje?",
            type: "text",
            weight: 1,
            criticality: "media",
            required: true,
            order: 3,
            helperText: "Se não souber agora, responda “a confirmar”.",
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q4",
            title: "Como a empresa ganha dinheiro hoje (canais: balcão, WhatsApp, entrega, B2B etc.)?",
            type: "multiple_choice",
            weight: 1,
            criticality: "media",
            required: true,
            order: 4,
            options: ["Balcão", "WhatsApp", "Entrega", "Vendas externas", "E-commerce", "B2B", "Outros"],
            audit: { updatedAt: "20/03/2025" },
          },
        ],
      },
      {
        id: "kickoff-s2",
        title: "Números essenciais e saúde financeira (visão rápida)",
        order: 2,
        weight: 20,
        audit: { updatedAt: "20/03/2025" },
        questions: [
          {
            id: "kickoff-q5",
            title: "Qual foi o faturamento aproximado do último mês?",
            type: "number",
            weight: 2,
            criticality: "alta",
            required: false,
            order: 1,
            minValue: 0,
            helperText: "Informe em R$. Se não souber, deixe em branco para gerar pendência.",
            regraOportunidade: {
              id: "kickoff-op-q5",
              name: "Visibilidade de faturamento",
              description:
                "Falta de visibilidade de faturamento impede controle e decisões. Sugestão: implantar rotina de fechamento diário e relatório mensal.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "always" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q6",
            title: "Você sabe a margem média (aproximada) do negócio?",
            type: "multiple_choice",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            options: ["Sei com segurança", "Sei mais ou menos", "Não sei"],
            regraOportunidade: {
              id: "kickoff-op-q6",
              name: "Painel de margem",
              description:
                "Margem desconhecida: risco de vender muito e lucrar pouco. Sugestão: montar painel de margem por categoria e itens críticos.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Sei mais ou menos", "Não sei"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q7",
            title: "Quais são as 3 maiores despesas fixas do mês?",
            type: "text",
            weight: 1,
            criticality: "media",
            required: true,
            order: 3,
            helperText: "Se não souber, responda “não sei” ou “a confirmar”.",
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q8",
            title: "Existe controle de contas a pagar e receber com calendário de vencimentos?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 4,
            regraOportunidade: {
              id: "kickoff-op-q8",
              name: "Calendário financeiro",
              description:
                "Sem calendário financeiro: risco de atraso, multa e aperto de caixa. Sugestão: criar calendário mensal e rotina semanal de revisão.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q9",
            title: "Hoje a empresa está mais em qual situação?",
            type: "multiple_choice",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 5,
            options: ["Caixa sobrando", "Caixa apertado", "Endividada", "Não sei"],
            regraOportunidade: {
              id: "kickoff-op-q9",
              name: "Foco em fluxo de caixa",
              description:
                "Situação de caixa indefinida ou crítica: priorizar fluxo de caixa e giro. Sugestão: mapear fluxo de caixa semanal e travas de compra.",
              type: "Risco evitado",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Caixa apertado", "Endividada", "Não sei"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
        ],
      },
      {
        id: "kickoff-s3",
        title: "Compras e fornecedores (panorama)",
        order: 3,
        weight: 15,
        audit: { updatedAt: "20/03/2025" },
        questions: [
          {
            id: "kickoff-q10",
            title: "Como vocês decidem o que comprar: histórico de vendas, mínimo/máximo ou feeling?",
            type: "multiple_choice",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            options: ["Histórico e giro", "Mínimo/máximo definido", "Feeling", "Misturado", "Não sei"],
            regraOportunidade: {
              id: "kickoff-op-q10",
              name: "Método de compra por giro",
              description:
                "Compras reativas: ausência de método de giro e reposição. Sugestão: implantar sugestão de compra por curva ABC e giro.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Feeling", "Não sei"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q11",
            title: "Existe Curva ABC e ela é usada na compra e negociação?",
            type: "multiple_choice",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            options: ["Sim e usamos", "Existe mas não usamos", "Não existe", "Não sei"],
            regraOportunidade: {
              id: "kickoff-op-q11",
              name: "Ritual de Curva ABC",
              description:
                "Curva ABC ausente ou não aplicada: falta foco nos itens que movem caixa. Sugestão: gerar ABC por faturamento e margem e criar ritual semanal.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Existe mas não usamos", "Não existe", "Não sei"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q12",
            title: "O recebimento tem conferência formal (quantidade e custo)?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 3,
            regraOportunidade: {
              id: "kickoff-op-q12",
              name: "Checklist de recebimento",
              description:
                "Sem conferência formal no recebimento: risco de pagar errado e perder dinheiro. Sugestão: implantar checklist de recebimento e contestação em 24h.",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
        ],
      },
      {
        id: "kickoff-s4",
        title: "Estoque e operação (realidade do chão)",
        order: 4,
        weight: 20,
        audit: { updatedAt: "20/03/2025" },
        questions: [
          {
            id: "kickoff-q13",
            title: "Qual cenário acontece mais hoje?",
            type: "multiple_choice",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            options: ["Falta produto (ruptura)", "Sobra produto (encalhe)", "Os dois", "Não sei"],
            regraOportunidade: {
              id: "kickoff-op-q13",
              name: "Ajuste de estoque",
              description:
                "Ruptura e/ou encalhe: estoque desalinhado com vendas. Sugestão: mapear itens A com ruptura e itens parados e ajustar compra.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: {
                type: "multiple_choice",
                matchingOptions: ["Falta produto (ruptura)", "Sobra produto (encalhe)", "Os dois", "Não sei"],
                matchStrategy: "any",
              },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q14",
            title: "Existe inventário e contagem cíclica com rotina definida?",
            type: "yes_no",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            regraOportunidade: {
              id: "kickoff-op-q14",
              name: "Contagem cíclica por ABC",
              description:
                "Sem contagem cíclica: risco de perdas, divergências e compras erradas. Sugestão: criar contagem cíclica por curva ABC (A semanal, B quinzenal, C mensal).",
              type: "Redução de custos",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q15",
            title: "Existe padrão de processos operacionais (POPs) para rotinas críticas?",
            type: "scale",
            weight: 1,
            criticality: "media",
            required: true,
            order: 3,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Não existe padrão, 5 = POPs completos e usados.",
            regraOportunidade: {
              id: "kickoff-op-q15",
              name: "Padronizar POPs críticos",
              description:
                "Processos não padronizados geram retrabalho e dependência de pessoas. Sugestão: documentar 5 POPs críticos e treinar equipe.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q16",
            title: "Quais são as 3 rotinas mais críticas da operação (ex: recebimento, separação, entrega)?",
            type: "text",
            weight: 1,
            criticality: "media",
            required: true,
            order: 4,
            helperText: "Se necessário, responda “a confirmar”.",
            audit: { updatedAt: "20/03/2025" },
          },
        ],
      },
      {
        id: "kickoff-s5",
        title: "Gestão, equipe e execução (onde projetos morrem)",
        order: 5,
        weight: 15,
        audit: { updatedAt: "20/03/2025" },
        questions: [
          {
            id: "kickoff-q17",
            title: "Quem decide e aprova mudanças (dono, gerente, time)?",
            type: "text",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 1,
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q18",
            title: "Existe reunião de acompanhamento com rotina e pauta fixa?",
            type: "yes_no",
            weight: 1,
            criticality: "media",
            required: true,
            order: 2,
            regraOportunidade: {
              id: "kickoff-op-q18",
              name: "Ritual de acompanhamento",
              description:
                "Sem cadência de acompanhamento: execução cai e projeto não sustenta. Sugestão: criar ritual semanal de 30 min com indicadores e pendências.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "yes_no", expectedAnswer: "no" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q19",
            title: "Em uma escala de 1 a 5, quão aberta a equipe está para mudar processo?",
            type: "scale",
            weight: 1,
            criticality: "media",
            required: true,
            order: 3,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Resistência alta, 5 = Muito aberta.",
            regraOportunidade: {
              id: "kickoff-op-q19",
              name: "Plano de comunicação",
              description:
                "Resistência à mudança pode travar implementação. Sugestão: criar plano de comunicação e quick wins visíveis.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
        ],
      },
      {
        id: "kickoff-s6",
        title: "Dados, sistemas e visibilidade (sem dado, sem dinheiro achado)",
        order: 6,
        weight: 15,
        audit: { updatedAt: "20/03/2025" },
        questions: [
          {
            id: "kickoff-q20",
            title: "Quais sistemas são usados hoje (ERP, PDV, planilhas, WhatsApp)?",
            type: "text",
            weight: 1,
            criticality: "media",
            required: true,
            order: 1,
            helperText: "Liste o que existe hoje. Se não souber, responda “a confirmar”.",
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q21",
            title: "Vocês conseguem extrair relatórios de vendas, compras e estoque com facilidade?",
            type: "scale",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 2,
            minValue: 1,
            maxValue: 5,
            helperText: "1 = Muito difícil, 5 = Muito fácil.",
            regraOportunidade: {
              id: "kickoff-op-q21",
              name: "Padronizar extrações de dados",
              description:
                "Baixa capacidade de extrair dados: decisões no escuro. Sugestão: padronizar extrações e criar 1 dashboard de base.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "scale", maxValue: 2 },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q22",
            title: "Quem é o dono do dado (quem gera, confere e responde por números)?",
            type: "text",
            weight: 1,
            criticality: "media",
            required: true,
            order: 3,
            helperText: "Se não existir hoje, responda “não sei”.",
            regraOportunidade: {
              id: "kickoff-op-q22",
              name: "Definir donos do dado",
              description:
                "Sem dono do dado: inconsistência e decisões erradas. Sugestão: definir responsável por vendas, compras, estoque e financeiro.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "media",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "always" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q23",
            title: "Quais dados você consegue fornecer hoje? (marque os disponíveis)",
            type: "multiple_choice",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 4,
            options: [
              "Vendas diárias",
              "Compras por item",
              "Estoque atual",
              "Contas a pagar",
              "Contas a receber",
              "Extrato bancário",
              "Curva ABC",
              "Outros",
            ],
            regraOportunidade: {
              id: "kickoff-op-q23",
              name: "Pacote mínimo de dados",
              description:
                "Falta de dados essenciais: priorizar coleta mínima para diagnóstico. Sugestão: criar pacote mínimo de dados para gerar diagnóstico e painel base.",
              type: "Eficiência operacional",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "always" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
          {
            id: "kickoff-q24",
            title: "Cite 3 áreas onde você acredita que existe ‘dinheiro na mesa’ hoje.",
            type: "text",
            weight: 2,
            criticality: "alta",
            required: true,
            order: 5,
            regraOportunidade: {
              id: "kickoff-op-q24",
              name: "Hipóteses de dinheiro na mesa",
              description:
                "Hipóteses iniciais de dinheiro na mesa coletadas no kickoff. Sugestão: transformar hipóteses em oportunidades com evidências e tasks de quick win.",
              type: "Receita incremental",
              estimatedValue: null,
              confidence: "alta",
              evidenceType: "a_coletar",
              enabled: true,
              autoGenerate: true,
              condition: { type: "always" },
              audit: { updatedAt: "20/03/2025" },
            },
            audit: { updatedAt: "20/03/2025" },
          },
        ],
      },
    ],
    questionCount: 24,
    sectionsCount: 6,
    estimatedTimeMinutes: 30,
    version: "v1.0",
    updatedAt: "20/03/2025",
    createdAt: "20/03/2025",
  },
];

// Tipo temporário para colunas que existem no banco mas ainda não estão no types.ts gerado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtendedDiagnosticRow = Database["public"]["Tables"]["diagnostics"]["Row"] & Record<string, any>;

const mapDiagnosticFromDb = (row: ExtendedDiagnosticRow): Diagnostic => ({
  id: row.id,
  name: row.name,
  projectId: row.project_id || "",
  projectName: row.project_name || "",
  clientId: row.client_id || "",
  clientName: row.client_name || "",
  templateId: row.template_id || "",
  templateName: row.template_name || "",
  status: (row.status as Diagnostic["status"]) || "draft",
  progress: row.progress ?? 0,
  score: row.score ?? undefined,
  opportunities: row.opportunities_count ?? 0,
  createdAt: formatDatePtBR(row.created_at),
  updatedAt: formatDatePtBR(row.updated_at),
  totalQuestions: row.total_questions ?? 0,
  answeredQuestions: row.answered_questions ?? 0,
  autoGenerateOpportunities: row.auto_generate_opportunities ?? true,
  responsibleName: row.responsible_name || undefined,
  responsibleId: row.responsible_id || undefined,
  dueDate: formatDatePtBR(row.due_date),
  actionPlan: row.action_plan as unknown as Diagnostic["actionPlan"],
  reportPayload: row.report_payload as unknown as Diagnostic["reportPayload"],
});
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

// Tipos temporários até que as tabelas de templates sejam criadas no banco
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbTemplateRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbSectionRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbQuestionRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRuleRow = any;

type TemplateDescriptionPayload = {
  description?: string;
  tags?: string[];
  status?: DiagnosticTemplateStatus;
  version?: string;
  revision?: number;
  estimatedTimeMinutes?: number | null;
  lastPublishedAt?: string;
  audit?: AuditMetadata;
};

type SectionDescriptionPayload = {
  description?: string;
  weight?: number;
  audit?: AuditMetadata;
};

type QuestionMetadataPayload = {
  type?: TemplateQuestion["type"];
  weight?: number;
  includeInScore?: boolean;
  criticality?: TemplateQuestion["criticality"];
  required?: boolean;
  questionDescription?: string;
  helperText?: string;
  placeholder?: string;
  minValue?: number | null;
  maxValue?: number | null;
  audit?: AuditMetadata;
  optionsWithWeight?: QuestionOption[];
  allowedFileTypes?: string[];
  maxFileSizeMB?: number | null;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asUuid = (value?: string) => (value && uuidRegex.test(value) ? value : undefined);

export const isMissingTemplatesTableMessage = (message?: string): boolean => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("schema cache") ||
    normalized.includes('relation "diagnostic_templates" does not exist')
  );
};

const isMissingTemplatesTable = (error: PostgrestError | null): boolean => {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  return isMissingTemplatesTableMessage(error.message);
};

const deserializeTemplateDescription = (raw?: string | null) => {
  if (!raw) return { description: "", metadata: {} as TemplateDescriptionPayload };

  try {
    const parsed = JSON.parse(raw) as TemplateDescriptionPayload & { description?: string };

    if (parsed && typeof parsed === "object") {
      const { description = "", ...metadata } = parsed;
      return { description, metadata };
    }
  } catch {
    // ignore parsing errors and fall back to plain text
  }

  return { description: raw, metadata: {} as TemplateDescriptionPayload };
};

const serializeTemplateDescription = (template: Partial<DiagnosticTemplate> & { id?: string }) =>
  JSON.stringify({
    description: template.description || "",
    tags: template.tags || [],
    status: template.status || "draft",
    version: template.version,
    revision: template.revision,
    estimatedTimeMinutes: template.estimatedTimeMinutes ?? null,
    lastPublishedAt: template.lastPublishedAt,
    audit: template.audit,
  });

const deserializeSectionDescription = (raw?: string | null) => {
  if (!raw) return { description: "", metadata: {} as SectionDescriptionPayload };

  try {
    const parsed = JSON.parse(raw) as SectionDescriptionPayload & { description?: string };
    if (parsed && typeof parsed === "object") {
      const { description = "", ...metadata } = parsed;
      return { description, metadata };
    }
  } catch {
    // ignore parsing errors and fall back to plain text
  }

  return { description: raw, metadata: {} as SectionDescriptionPayload };
};

const serializeSectionDescription = (section: TemplateSection) =>
  JSON.stringify({
    description: section.description || "",
    weight: section.weight ?? 1,
    audit: section.audit,
  });

const serializeQuestionMetadata = (question: TemplateQuestion): QuestionMetadataPayload => ({
  type: question.type,
  weight: question.weight,
  includeInScore: question.includeInScore,
  criticality: question.criticality,
  required: question.required,
  questionDescription: question.description,
  helperText: question.helperText,
  placeholder: question.placeholder,
  minValue: question.minValue ?? null,
  maxValue: question.maxValue ?? null,
  audit: question.audit,
  optionsWithWeight: question.optionsWithWeight,
  allowedFileTypes: question.allowedFileTypes,
  maxFileSizeMB: question.maxFileSizeMB ?? null,
});

const parseQuestionMetadata = (payload: DbQuestionRow["metadata"]): QuestionMetadataPayload => {
  if (!payload || typeof payload !== "object") return {};
  return payload as QuestionMetadataPayload;
};

const mapQuestionTypeToDb = (type: TemplateQuestion["type"]): string => {
  switch (type) {
    case "yes_no":
      return "boolean";
    case "scale":
      return "rating";
    case "number":
      return "number";
    case "multiple_choice":
      return "select";
    default:
      return "text";
  }
};

const mapQuestionTypeFromDb = (dbType: string, metadataType?: TemplateQuestion["type"]): TemplateQuestion["type"] => {
  if (metadataType) return metadataType;

  switch (dbType) {
    case "boolean":
      return "yes_no";
    case "rating":
      return "scale";
    case "number":
      return "number";
    case "select":
      return "multiple_choice";
    default:
      return "text";
  }
};

const serializeQuestionOptions = (question: TemplateQuestion): QuestionOption[] => {
  if (question.optionsWithWeight?.length) return question.optionsWithWeight;
  if (question.options?.length) return question.options.map((label) => ({ label, weight: null }));
  return [];
};

const mapRuleFromDb = (rule: DbRuleRow): TemplateOpportunityRule => {
  const actions = (rule.actions as Record<string, unknown>) || {};

  return {
    id: rule.id,
    name: (actions.name as string) || rule.title || "Regra de oportunidade",
    description: (actions.description as string) || rule.description || "",
    type: ((actions.type as TemplateOpportunityRule["type"]) || "Outro") as TemplateOpportunityRule["type"],
    estimatedValue: typeof actions.estimatedValue === "number" ? actions.estimatedValue : null,
    confidence: (actions.confidence as TemplateOpportunityRule["confidence"]) || "media",
    evidenceType: (actions.evidenceType as TemplateOpportunityRule["evidenceType"]) || "a_coletar",
    enabled: (actions.enabled as boolean) ?? true,
    autoGenerate: (actions.autoGenerate as boolean) ?? true,
    condition: (rule.rule_conditions as OpportunityRuleCondition) || { type: "always" },
    audit: actions.audit as AuditMetadata | undefined,
  };
};

const mapRuleToDb = (
  rule: TemplateOpportunityRule,
  templateId: string,
  sectionId?: string,
  questionId?: string
): DbRuleRow["Insert"] => ({
  id: asUuid(rule.id),
  template_id: templateId,
  section_id: sectionId || null,
  question_id: questionId || null,
  title: rule.name,
  description: rule.description,
  rule_conditions: rule.condition ?? { type: "always" },
  actions: {
    type: rule.type,
    estimatedValue: rule.estimatedValue ?? null,
    confidence: rule.confidence,
    evidenceType: rule.evidenceType,
    enabled: rule.enabled,
    autoGenerate: rule.autoGenerate,
    name: rule.name,
    description: rule.description,
    audit: rule.audit,
  },
});

const mapQuestionFromDb = (question: DbQuestionRow, rules: DbRuleRow[]): TemplateQuestion => {
  const metadata = parseQuestionMetadata(question.metadata);
  const rawOptions = question.options as QuestionOption[] | string[] | null;
  const optionsWithWeight = (metadata.optionsWithWeight || rawOptions || []) as QuestionOption[];
  const normalizedOptions = (optionsWithWeight || []).map((option) =>
    typeof option === "string" ? { label: option, weight: null } : option
  );
  const linkedRule = rules.find((rule) => rule.question_id === question.id);

  return {
    id: question.id,
    title: question.question,
    description: metadata.questionDescription || metadata.helperText || "",
    type: mapQuestionTypeFromDb(question.question_type, metadata.type),
    weight: metadata.weight ?? 1,
    includeInScore: metadata.includeInScore ?? true,
    criticality: metadata.criticality ?? "media",
    required: metadata.required ?? true,
    helperText: metadata.helperText || "",
    placeholder: metadata.placeholder || "",
    order: question.position ?? 0,
    minValue: metadata.minValue ?? null,
    maxValue: metadata.maxValue ?? null,
    options: normalizedOptions.map((option) => option.label),
    optionsWithWeight: normalizedOptions,
    regraOportunidade: linkedRule ? mapRuleFromDb(linkedRule) : undefined,
    maxFileSizeMB: metadata.maxFileSizeMB ?? null,
    allowedFileTypes: metadata.allowedFileTypes ?? [],
    audit: metadata.audit,
  };
};

const mapSectionFromDb = (
  section: DbSectionRow,
  questions: DbQuestionRow[],
  rules: DbRuleRow[]
): TemplateSection => {
  const { description, metadata } = deserializeSectionDescription(section.description);
  const sectionQuestions = questions
    .filter((question) => question.section_id === section.id)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((question) => mapQuestionFromDb(question, rules));

  return {
    id: section.id,
    title: section.title,
    description,
    order: section.position ?? 0,
    weight: metadata.weight ?? 1,
    questions: sectionQuestions,
    audit: metadata.audit,
  };
};

const mapTemplateFromDb = (
  template: DbTemplateRow,
  sections: TemplateSection[]
): DiagnosticTemplate => {
  const { description, metadata } = deserializeTemplateDescription(template.description);
  const questionCount = sections.reduce((count, section) => count + (section.questions?.length || 0), 0);

  return {
    id: template.id,
    name: template.name,
    description,
    tags: metadata.tags || [],
    status: metadata.status || "draft",
    version: metadata.version || "v1.0",
    revision: metadata.revision ?? 1,
    sections,
    questionCount,
    sectionsCount: sections.length,
    estimatedTimeMinutes: metadata.estimatedTimeMinutes ?? null,
    lastPublishedAt: metadata.lastPublishedAt,
    updatedAt: formatDatePtBR(new Date(template.updated_at)),
    createdAt: formatDatePtBR(new Date(template.created_at)),
    audit: metadata.audit,
  };
};

const insertTemplateStructure = async (templateId: string, sections: TemplateSection[]) => {
  for (const section of sections) {
    const { data: sectionRow, error: sectionError } = await untypedSupabase
      .from("template_sections")
      .insert({
        id: asUuid(section.id),
        template_id: templateId,
        title: section.title,
        description: serializeSectionDescription(section),
        position: section.order,
      })
      .select()
      .single();

    if (sectionError || !sectionRow) {
      throw new Error(sectionError?.message || "Erro ao salvar seção do template");
    }

    for (const question of section.questions || []) {
      const { data: questionRow, error: questionError } = await untypedSupabase
        .from("template_questions")
        .insert({
          id: asUuid(question.id),
          template_id: templateId,
          section_id: sectionRow.id,
          title: question.title,
          description: question.description || null,
          type: mapQuestionTypeToDb(question.type),
          weight: question.weight ?? 1,
          criticality: question.criticality || 'media',
          required: question.required ?? false,
          position: question.order ?? 0,
          helper_text: question.helperText || null,
          min_value: question.minValue ?? null,
          max_value: question.maxValue ?? null,
          options: serializeQuestionOptions(question),
          audit: question.audit ? JSON.stringify(question.audit) : null,
        })
        .select()
        .single();

      if (questionError || !questionRow) {
        throw new Error(questionError?.message || "Erro ao salvar pergunta do template");
      }

      if (question.regraOportunidade) {
        const { error: ruleError } = await untypedSupabase
          .from("template_opportunity_rules")
          .insert(mapRuleToDb(question.regraOportunidade, templateId, sectionRow.id, questionRow.id));

        if (ruleError) {
          throw new Error(ruleError.message || "Erro ao salvar regra de oportunidade");
        }
      }
    }
  }
};

const rebuildTemplateStructure = async (templateId: string, sections: TemplateSection[]) => {
  await untypedSupabase.from("template_opportunity_rules").delete().eq("template_id", templateId);
  await untypedSupabase.from("template_questions").delete().eq("template_id", templateId);
  await untypedSupabase.from("template_sections").delete().eq("template_id", templateId);
  await insertTemplateStructure(templateId, sections);
};

const fetchTemplateById = async (id: string): Promise<DiagnosticTemplate | null> => {
  const { data: templateRow, error: templateError } = await untypedSupabase
    .from("diagnostic_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (templateError || !templateRow) return null;

  const [{ data: sections }, { data: questions }, { data: rules }] = await Promise.all([
    untypedSupabase.from("template_sections").select("*").eq("template_id", id),
    untypedSupabase.from("template_questions").select("*").eq("template_id", id),
    untypedSupabase.from("template_opportunity_rules").select("*").eq("template_id", id),
  ]);

  const sectionList = (sections || []).map((section: DbSectionRow) =>
    mapSectionFromDb(section, questions || [], rules || [])
  );

  return mapTemplateFromDb(templateRow, sectionList);
};

export const fetchDiagnostics = async (): Promise<Diagnostic[]> => {
  const { data, error } = await untypedSupabase.from("diagnostics").select("*").order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Erro ao carregar diagnósticos");
  }

  return (data || []).map((row: ExtendedDiagnosticRow) => mapDiagnosticFromDb(row));
};

export const fetchTemplates = async (): Promise<{ templates: DiagnosticTemplate[]; fromSeed: boolean }> => {
  const { data: templateRows, error } = await untypedSupabase
    .from("diagnostic_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingTemplatesTable(error)) {
      console.warn(
        "Tabela diagnostic_templates não encontrada; usando templates seed enquanto as migrações não forem aplicadas."
      );
      return { templates: templateSeed, fromSeed: true };
    }
    throw new Error(error.message || "Erro ao carregar templates");
  }

  // Se a tabela existe mas está vazia, popula com os templates seed
  if (!templateRows?.length) {
    console.log("Tabela diagnostic_templates vazia; populando com templates seed...");
    try {
      for (const seed of templateSeed) {
        await createTemplate(seed);
      }
      // Refetch após popular
      return fetchTemplates();
    } catch (seedError) {
      console.error("Erro ao popular templates seed:", seedError);
      // Fallback para seeds em memória se falhar
      return { templates: templateSeed, fromSeed: true };
    }
  }

  const templateIds = templateRows.map((row: DbTemplateRow) => row.id);

  const [sectionsResponse, questionsResponse, rulesResponse] = await Promise.all([
    untypedSupabase
      .from("template_sections")
      .select("*")
      .in("template_id", templateIds)
      .order("position", { ascending: true }),
    untypedSupabase
      .from("template_questions")
      .select("*")
      .in("template_id", templateIds)
      .order("position", { ascending: true }),
    untypedSupabase.from("template_opportunity_rules").select("*").in("template_id", templateIds),
  ]);

  if (sectionsResponse.error) throw new Error(sectionsResponse.error.message);
  if (questionsResponse.error) throw new Error(questionsResponse.error.message);
  if (rulesResponse.error) throw new Error(rulesResponse.error.message);

  const sections = sectionsResponse.data || [];
  const questions = questionsResponse.data || [];
  const rules = rulesResponse.data || [];

  const templates = templateRows.map((templateRow: DbTemplateRow) => {
    const templateSections = sections.filter((section: DbSectionRow) => section.template_id === templateRow.id);
    const mappedSections = templateSections.map((section: DbSectionRow) =>
      mapSectionFromDb(section, questions.filter((question: DbQuestionRow) => question.section_id === section.id), rules)
    );
    return mapTemplateFromDb(templateRow, mappedSections);
  });

  return { templates, fromSeed: false };
};

export const createTemplate = async (
  template: Omit<DiagnosticTemplate, "id"> & { id?: string }
): Promise<DiagnosticTemplate> => {
  const { data: templateRow, error } = await untypedSupabase
    .from("diagnostic_templates")
    .insert({
      id: asUuid(template.id),
      name: template.name,
      description: serializeTemplateDescription(template),
    })
    .select()
    .single();

  if (error || !templateRow) {
    throw new Error(error?.message || "Erro ao criar template");
  }

  await insertTemplateStructure(templateRow.id, template.sections || []);

  return (await fetchTemplateById(templateRow.id)) || mapTemplateFromDb(templateRow, []);
};

export const updateTemplateRecord = async (
  id: string,
  template: Partial<DiagnosticTemplate>
): Promise<DiagnosticTemplate> => {
  const { error } = await untypedSupabase
    .from("diagnostic_templates")
    .update({
      name: template.name,
      description: serializeTemplateDescription({
        ...template,
        name: template.name || "",
        tags: template.tags || [],
        status: (template.status as DiagnosticTemplateStatus) || "draft",
        sections: template.sections || [],
        questionCount: template.questionCount,
        sectionsCount: template.sectionsCount,
        estimatedTimeMinutes: template.estimatedTimeMinutes ?? null,
        revision: template.revision,
        version: template.version,
        description: template.description || "",
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Erro ao atualizar template");
  }

  await rebuildTemplateStructure(id, template.sections || []);

  const updated = await fetchTemplateById(id);
  if (!updated) throw new Error("Template não encontrado após atualização");
  return updated;
};

export const deleteTemplateRecord = async (id: string) => {
  const { error } = await untypedSupabase.from("diagnostic_templates").delete().eq("id", id);
  if (error) {
    throw new Error(error.message || "Erro ao remover template");
  }
};

export const applyDiagnostic = async (input: ApplyDiagnosticInput): Promise<Diagnostic> => {
  const { templateName, projectName, templateQuestionCount } = input;
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `diagnostic-${Math.random().toString(36).slice(2, 8)}`;
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
