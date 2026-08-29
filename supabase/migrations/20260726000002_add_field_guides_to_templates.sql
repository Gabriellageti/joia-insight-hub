-- Preenche o guia de campo das perguntas já existentes.
-- Preserva qualquer orientação que já tenha sido escrita manualmente.
UPDATE public.template_questions AS question
SET helper_text = concat(
  CASE question.type
    WHEN 'yes_no' THEN 'Faça a pergunta em linguagem simples e peça um exemplo real de como isso acontece hoje. Se a resposta for sim, pergunte quem faz, com que frequência e onde está a evidência.'
    WHEN 'boolean' THEN 'Faça a pergunta de forma direta, sem induzir a resposta. Peça um exemplo recente e registre o impacto que essa situação trouxe para a empresa.'
    WHEN 'number' THEN 'Explique qual número precisa ser levantado, confirme o período de referência e pergunte de qual relatório, sistema ou controle ele foi obtido.'
    WHEN 'scale' THEN 'Explique a escala antes de pedir a nota: 1 representa uma situação muito frágil e 10 uma prática consistente. Peça um exemplo que justifique a nota escolhida.'
    WHEN 'rating' THEN 'Explique que a nota deve refletir a dor atual do negócio: 1 significa pouco impacto e 10 uma situação crítica. Peça um caso recente que explique a nota.'
    WHEN 'multiple_choice' THEN 'Leia as alternativas em linguagem natural, peça exemplos das opções escolhidas e marque somente o que realmente ocorre hoje.'
    WHEN 'select' THEN 'Leia as opções com calma, confirme o entendimento e registre a alternativa que melhor representa a realidade atual da empresa.'
    ELSE 'Conduza como uma conversa aberta. Peça fatos, exemplos recentes e nomes de documentos ou controles que comprovem a resposta.'
  END,
  E'\n\nPergunta técnica: ', question.title,
  E'\nObjetivo da etapa: ', COALESCE(section.title, 'Entender a situação atual da empresa'),
  E'\nDica: registre a prática atual, não a resposta ideal ou o plano futuro.'
)
FROM public.template_sections AS section
WHERE question.section_id = section.id
  AND (question.helper_text IS NULL OR btrim(question.helper_text) = '');
