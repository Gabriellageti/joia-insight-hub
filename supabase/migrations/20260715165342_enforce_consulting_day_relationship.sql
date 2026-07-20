
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_consulting_day_plan_fkey
  FOREIGN KEY (project_id, consulting_day)
  REFERENCES public.consulting_day_plans (project_id, day_number)
  ON UPDATE CASCADE
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_consulting_day_plan_fkey;
