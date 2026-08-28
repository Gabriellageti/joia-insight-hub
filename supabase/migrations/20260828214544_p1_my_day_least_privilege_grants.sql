BEGIN;

REVOKE ALL ON TABLE public.daily_checkins FROM authenticated;
REVOKE ALL ON TABLE public.daily_focus_tasks FROM authenticated;
REVOKE ALL ON TABLE public.internal_notifications FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.daily_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_focus_tasks TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.internal_notifications TO authenticated;

COMMIT;
