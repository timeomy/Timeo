DO $$
BEGIN
  -- clients.assigned_coach_id -> profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_assigned_coach_id_fkey'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_assigned_coach_id_fkey
      FOREIGN KEY (assigned_coach_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  -- training_logs.coach_id -> profiles.id (needed for profiles:coach_id join)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'training_logs_coach_id_fkey'
  ) THEN
    ALTER TABLE public.training_logs
      ADD CONSTRAINT training_logs_coach_id_fkey
      FOREIGN KEY (coach_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_assigned_coach_id ON public.clients(assigned_coach_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_coach_id ON public.training_logs(coach_id);