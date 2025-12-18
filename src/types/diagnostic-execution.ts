// Types for diagnostic execution/wizard

export interface DiagnosticAnswer {
  questionId: string;
  value: string | number | boolean | string[] | null;
  attachmentUrl?: string;
  answeredAt: string;
  notes?: string;
}

export interface DiagnosticExecutionState {
  diagnosticId: string;
  templateId: string;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  answers: Record<string, DiagnosticAnswer>;
  startedAt: string;
  lastSavedAt?: string;
}

export interface QuestionNavigationInfo {
  sectionIndex: number;
  questionIndex: number;
  globalIndex: number;
  isFirst: boolean;
  isLast: boolean;
  isAnswered: boolean;
}
