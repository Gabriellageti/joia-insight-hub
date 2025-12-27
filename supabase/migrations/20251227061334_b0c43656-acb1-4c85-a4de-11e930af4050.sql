-- Criar tabela para histórico de valores dos indicadores
CREATE TABLE public.indicator_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(indicator_id, recorded_at)
);

-- Adicionar campos faltantes na tabela indicators
ALTER TABLE public.indicators 
ADD COLUMN IF NOT EXISTS alert_threshold NUMERIC,
ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'below_target',
ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN DEFAULT false;

-- Criar índice para buscas rápidas por indicador e data
CREATE INDEX idx_indicator_history_indicator_id ON public.indicator_history(indicator_id);
CREATE INDEX idx_indicator_history_recorded_at ON public.indicator_history(recorded_at);

-- Habilitar RLS
ALTER TABLE public.indicator_history ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Authenticated users can view indicator history" 
ON public.indicator_history 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert indicator history" 
ON public.indicator_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update indicator history" 
ON public.indicator_history 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete indicator history" 
ON public.indicator_history 
FOR DELETE 
USING (true);

-- Trigger para atualizar current_value e trend no indicator ao inserir histórico
CREATE OR REPLACE FUNCTION public.update_indicator_from_history()
RETURNS TRIGGER AS $$
DECLARE
  prev_value NUMERIC;
  new_trend TEXT;
BEGIN
  -- Buscar valor anterior
  SELECT value INTO prev_value
  FROM public.indicator_history
  WHERE indicator_id = NEW.indicator_id
    AND recorded_at < NEW.recorded_at
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Calcular tendência
  IF prev_value IS NULL THEN
    new_trend := 'stable';
  ELSIF NEW.value > prev_value THEN
    new_trend := 'up';
  ELSIF NEW.value < prev_value THEN
    new_trend := 'down';
  ELSE
    new_trend := 'stable';
  END IF;

  -- Atualizar indicador
  UPDATE public.indicators
  SET current_value = NEW.value,
      trend = new_trend,
      updated_at = now()
  WHERE id = NEW.indicator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_indicator_from_history
AFTER INSERT ON public.indicator_history
FOR EACH ROW
EXECUTE FUNCTION public.update_indicator_from_history();