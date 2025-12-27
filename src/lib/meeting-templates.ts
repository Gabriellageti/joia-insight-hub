export interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  sections: {
    title: string;
    placeholder: string;
  }[];
}

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: "kickoff",
    name: "Reunião de Kickoff",
    description: "Para início de projetos: objetivos, escopo, cronograma, responsáveis",
    sections: [
      {
        title: "Contexto e Objetivos",
        placeholder: "Descreva o contexto do projeto e os principais objetivos a serem alcançados...",
      },
      {
        title: "Escopo do Projeto",
        placeholder: "Defina o que está incluído e excluído do escopo...",
      },
      {
        title: "Cronograma e Marcos",
        placeholder: "Liste as principais datas e entregas previstas...",
      },
      {
        title: "Papéis e Responsabilidades",
        placeholder: "Identifique os responsáveis por cada área/entrega...",
      },
      {
        title: "Próximos Passos",
        placeholder: "Liste as ações imediatas e seus responsáveis...",
      },
      {
        title: "Riscos Identificados",
        placeholder: "Descreva os principais riscos e planos de mitigação...",
      },
    ],
  },
  {
    id: "status",
    name: "Status/Acompanhamento",
    description: "Para reuniões recorrentes: progresso, pendências, próximos passos",
    sections: [
      {
        title: "Progresso desde a Última Reunião",
        placeholder: "Liste o que foi concluído desde o último encontro...",
      },
      {
        title: "Pendências em Andamento",
        placeholder: "Descreva as tarefas em andamento e seu status...",
      },
      {
        title: "Bloqueios e Impedimentos",
        placeholder: "Identifique problemas que estão atrasando o progresso...",
      },
      {
        title: "Decisões Tomadas",
        placeholder: "Registre as decisões importantes desta reunião...",
      },
      {
        title: "Próximos Passos",
        placeholder: "Liste as ações para o próximo período com responsáveis e prazos...",
      },
      {
        title: "Observações Gerais",
        placeholder: "Outras informações relevantes...",
      },
    ],
  },
  {
    id: "retrospectiva",
    name: "Retrospectiva",
    description: "Para encerramento: o que funcionou, melhorias, lições aprendidas",
    sections: [
      {
        title: "O que Funcionou Bem",
        placeholder: "Liste os pontos positivos e práticas que devem continuar...",
      },
      {
        title: "O que Pode Melhorar",
        placeholder: "Identifique áreas de melhoria e oportunidades...",
      },
      {
        title: "Lições Aprendidas",
        placeholder: "Documente os aprendizados importantes do projeto/período...",
      },
      {
        title: "Ações de Melhoria",
        placeholder: "Defina ações concretas para implementar as melhorias...",
      },
      {
        title: "Reconhecimentos",
        placeholder: "Destaque contribuições excepcionais da equipe...",
      },
      {
        title: "Próximos Passos",
        placeholder: "Ações a serem tomadas após esta retrospectiva...",
      },
    ],
  },
  {
    id: "brainstorming",
    name: "Brainstorming",
    description: "Para ideação: ideias geradas, priorizações, ações definidas",
    sections: [
      {
        title: "Tema/Desafio",
        placeholder: "Defina claramente o problema ou oportunidade sendo explorado...",
      },
      {
        title: "Ideias Geradas",
        placeholder: "Liste todas as ideias apresentadas durante a sessão...",
      },
      {
        title: "Agrupamento e Temas",
        placeholder: "Organize as ideias em categorias ou temas...",
      },
      {
        title: "Priorização",
        placeholder: "Indique as ideias priorizadas e critérios utilizados...",
      },
      {
        title: "Ações Definidas",
        placeholder: "Liste as próximas ações para as ideias selecionadas...",
      },
      {
        title: "Ideias para Explorar Depois",
        placeholder: "Ideias promissoras que ficaram para análise futura...",
      },
    ],
  },
];

export function generateTemplateContent(template: MeetingTemplate): string {
  return template.sections
    .map((section) => `## ${section.title}\n\n${section.placeholder}\n`)
    .join("\n");
}

export function getTemplateById(id: string): MeetingTemplate | undefined {
  return MEETING_TEMPLATES.find((t) => t.id === id);
}
