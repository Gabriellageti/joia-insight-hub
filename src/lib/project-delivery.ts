import type { Project } from "@/types";

export type ProjectType =
  | "consulting"
  | "website"
  | "landing_page"
  | "web_system"
  | "client_portal"
  | "ecommerce"
  | "automation"
  | "ai_implementation"
  | "integration"
  | "other";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  consulting: "Consultoria",
  website: "Site institucional",
  landing_page: "Landing page",
  web_system: "Sistema web",
  client_portal: "Portal / Área do cliente",
  ecommerce: "E-commerce",
  automation: "Automação",
  ai_implementation: "Implementação de IA",
  integration: "Integração entre sistemas",
  other: "Outro",
};

export const PROJECT_TYPE_OPTIONS = Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => ({
  value: value as ProjectType,
  label,
}));

export interface DeliveryStep {
  title: string;
  description: string;
  checklist: string[];
  deliverables: string[];
  approvalRequired?: boolean;
}

const consultingSteps: DeliveryStep[] = [
  {
    title: "Diagnóstico",
    description: "Mapear o cenário atual, dores, oportunidades e indicadores base.",
    checklist: ["Reunião inicial realizada", "Dados principais coletados", "Oportunidades priorizadas"],
    deliverables: ["Diagnóstico inicial", "Mapa de oportunidades"],
  },
  {
    title: "Plano de ação",
    description: "Converter achados em iniciativas claras, responsáveis e prazos.",
    checklist: ["Ações definidas", "Responsáveis vinculados", "Cronograma validado"],
    deliverables: ["Plano de ação priorizado"],
    approvalRequired: true,
  },
  {
    title: "Execução",
    description: "Executar as ações combinadas e acompanhar evidências de avanço.",
    checklist: ["Tarefas em andamento", "Riscos acompanhados", "Evidências registradas"],
    deliverables: ["Registro de execução", "Evidências"],
  },
  {
    title: "Acompanhamento",
    description: "Mensurar resultados e ajustar próximos ciclos de melhoria.",
    checklist: ["Indicadores revisados", "Reuniões de acompanhamento feitas", "Próximos passos definidos"],
    deliverables: ["Relatório de acompanhamento"],
  },
];

const websiteSteps: DeliveryStep[] = [
  {
    title: "Briefing",
    description: "Entender negócio, público, objetivo, referências e materiais disponíveis.",
    checklist: ["Briefing preenchido", "Referências coletadas", "Objetivos validados"],
    deliverables: ["Documento de briefing", "Lista inicial de requisitos"],
  },
  {
    title: "Escopo",
    description: "Definir páginas, funcionalidades, critérios de aceite e limites do projeto.",
    checklist: ["Páginas definidas", "Itens fora do escopo registrados", "Critérios de aceite validados"],
    deliverables: ["Documento de escopo", "Cronograma macro"],
    approvalRequired: true,
  },
  {
    title: "Design / Protótipo",
    description: "Criar a experiência visual para desktop e mobile antes do desenvolvimento.",
    checklist: ["Wireframe criado", "Layout desktop criado", "Layout mobile criado", "Ajustes aplicados"],
    deliverables: ["Protótipo navegável", "Layout aprovado"],
    approvalRequired: true,
  },
  {
    title: "Desenvolvimento",
    description: "Implementar páginas, componentes, responsividade e integrações previstas.",
    checklist: ["Projeto configurado", "Páginas principais implementadas", "Formulários integrados"],
    deliverables: ["Link de homologação", "Build funcional"],
  },
  {
    title: "Conteúdo e SEO básico",
    description: "Inserir textos, imagens, metadados, links e revisões finais de conteúdo.",
    checklist: ["Conteúdos recebidos", "Imagens otimizadas", "Títulos e descrições revisados"],
    deliverables: ["Checklist de conteúdo", "SEO básico aplicado"],
  },
  {
    title: "Testes e Homologação",
    description: "Validar formulários, links, responsividade e aprovação final do cliente.",
    checklist: ["Fluxos testados", "Responsividade validada", "Feedback do cliente tratado"],
    deliverables: ["Relatório de testes", "Aprovação de homologação"],
    approvalRequired: true,
  },
  {
    title: "Publicação",
    description: "Configurar domínio, ambiente de produção, SSL e teste pós-deploy.",
    checklist: ["DNS configurado", "Deploy realizado", "Teste pós-publicação concluído"],
    deliverables: ["Link de produção", "Registro do deploy"],
  },
];

const systemSteps: DeliveryStep[] = [
  {
    title: "Descoberta e requisitos",
    description: "Mapear usuários, fluxos, regras de negócio, dados e restrições técnicas.",
    checklist: ["Personas/usuários definidos", "Requisitos priorizados", "Regras de negócio registradas"],
    deliverables: ["Documento de requisitos", "Backlog inicial"],
    approvalRequired: true,
  },
  {
    title: "Arquitetura",
    description: "Definir stack, módulos, permissões, integrações, dados e ambientes.",
    checklist: ["Stack definida", "Modelo de dados inicial", "Integrações mapeadas"],
    deliverables: ["Arquitetura técnica", "Mapa de módulos"],
  },
  {
    title: "UX/UI",
    description: "Prototipar fluxos principais e validar usabilidade antes do MVP.",
    checklist: ["Fluxos desenhados", "Telas principais criadas", "Protótipo validado"],
    deliverables: ["Protótipo", "Guia visual básico"],
    approvalRequired: true,
  },
  {
    title: "Desenvolvimento do MVP",
    description: "Construir o núcleo funcional com autenticação, módulos e integrações essenciais.",
    checklist: ["Ambiente configurado", "Módulos críticos implementados", "Integrações essenciais concluídas"],
    deliverables: ["MVP em homologação", "Registro de funcionalidades"],
  },
  {
    title: "Testes",
    description: "Validar fluxos, permissões, dados, integrações e erros críticos.",
    checklist: ["Testes funcionais", "Testes de permissões", "Bugs críticos corrigidos"],
    deliverables: ["Relatório de testes", "Lista de bugs tratada"],
  },
  {
    title: "Homologação e deploy",
    description: "Coletar aceite do cliente e publicar com plano de go-live.",
    checklist: ["Cliente orientado", "Ajustes finais feitos", "Deploy em produção concluído"],
    deliverables: ["Aprovação formal", "Link de produção"],
    approvalRequired: true,
  },
  {
    title: "Pós-lançamento",
    description: "Monitorar estabilidade, treinar usuários e registrar melhorias futuras.",
    checklist: ["Monitoramento inicial", "Treinamento realizado", "Melhorias futuras registradas"],
    deliverables: ["Manual básico", "Relatório final"],
  },
];

const aiSteps: DeliveryStep[] = [
  {
    title: "Diagnóstico de oportunidade",
    description: "Identificar caso de uso, ganho esperado, riscos e critérios de sucesso.",
    checklist: ["Caso de uso definido", "Critérios de sucesso definidos", "Riscos mapeados"],
    deliverables: ["Canvas da oportunidade de IA"],
  },
  {
    title: "Mapeamento de dados e processos",
    description: "Entender fontes de dados, fluxo operacional, acessos e limitações.",
    checklist: ["Processo atual mapeado", "Dados disponíveis verificados", "Acessos solicitados"],
    deliverables: ["Mapa de processo", "Inventário de dados"],
  },
  {
    title: "Protótipo",
    description: "Criar prova de conceito com escopo controlado para validação rápida.",
    checklist: ["Protótipo construído", "Usuários-chave testaram", "Resultados registrados"],
    deliverables: ["PoC funcional", "Relatório de validação"],
    approvalRequired: true,
  },
  {
    title: "Integração",
    description: "Conectar a solução aos canais, ferramentas e rotinas do cliente.",
    checklist: ["Integrações configuradas", "Permissões revisadas", "Logs monitorados"],
    deliverables: ["Solução integrada", "Guia operacional"],
  },
  {
    title: "Treinamento e monitoramento",
    description: "Treinar usuários, acompanhar adoção e ajustar prompts, fluxos ou automações.",
    checklist: ["Treinamento realizado", "Métricas acompanhadas", "Ajustes priorizados"],
    deliverables: ["Material de treinamento", "Relatório de resultados"],
  },
];

const automationSteps: DeliveryStep[] = [
  {
    title: "Processo atual",
    description: "Mapear a rotina manual, responsáveis, entradas, saídas e gargalos.",
    checklist: ["Fluxo atual mapeado", "Gargalos identificados", "Entradas e saídas definidas"],
    deliverables: ["Mapa do processo atual"],
  },
  {
    title: "Processo futuro",
    description: "Desenhar como o processo funcionará após a automação.",
    checklist: ["Fluxo futuro desenhado", "Regras definidas", "Exceções mapeadas"],
    deliverables: ["Fluxo automatizado proposto"],
    approvalRequired: true,
  },
  {
    title: "Implementação",
    description: "Configurar ferramentas, integrações, gatilhos e tratamento de erros.",
    checklist: ["Gatilhos configurados", "Integrações conectadas", "Erros tratados"],
    deliverables: ["Automação funcional"],
  },
  {
    title: "Testes e treinamento",
    description: "Testar cenários reais, treinar operadores e definir monitoramento.",
    checklist: ["Cenários testados", "Usuários treinados", "Monitoramento definido"],
    deliverables: ["Evidências de teste", "Manual operacional"],
  },
];

export const getProjectTypeLabel = (type?: string | null) =>
  PROJECT_TYPE_LABELS[(type as ProjectType) || "consulting"] || PROJECT_TYPE_LABELS.other;

export const getDeliveryStepsForProject = (project: Pick<Project, "projectType" | "phase">): DeliveryStep[] => {
  switch (project.projectType) {
    case "website":
    case "landing_page":
    case "ecommerce":
      return websiteSteps;
    case "web_system":
    case "client_portal":
    case "integration":
      return systemSteps;
    case "ai_implementation":
      return aiSteps;
    case "automation":
      return automationSteps;
    case "consulting":
    case "other":
    default:
      return consultingSteps;
  }
};
