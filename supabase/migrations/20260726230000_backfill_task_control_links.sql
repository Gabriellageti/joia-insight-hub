-- Unifica tarefas legadas no Controle de Tarefas.
-- Tarefas vinculadas a projeto precisam ter tipo de projeto e responsável digital.

UPDATE public.tasks
SET task_type = 'project'
WHERE project_id IS NOT NULL
  AND task_type IS DISTINCT FROM 'project';

UPDATE public.tasks AS task
SET assigned_to = employee.user_id,
    created_by = COALESCE(task.created_by, employee.user_id)
FROM public.employees AS employee
WHERE task.assigned_to IS NULL
  AND employee.user_id IS NOT NULL
  AND employee.status = 'active'
  AND lower(trim(task.responsible)) = lower(trim(employee.name));
