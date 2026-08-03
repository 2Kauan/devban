-- Criar funcao para auto-confirmar contas fantasmas
CREATE OR REPLACE FUNCTION public.auto_confirm_guests()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email LIKE '%@guest.devban.local' THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atrelar o gatilho antes de inserir um usuario
DROP TRIGGER IF EXISTS auto_confirm_guests_trigger ON auth.users;
CREATE TRIGGER auto_confirm_guests_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_guests();
