-- Update notify_member_permission_update to check if profile/user exists before inserting a notification on DELETE
CREATE OR REPLACE FUNCTION notify_member_permission_update()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name TEXT;
  v_sender_name TEXT;
BEGIN
  -- We need the project name
  SELECT name INTO v_project_name FROM projects WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- Sender is the one doing the action, we can get their name from profiles
  SELECT name INTO v_sender_name FROM profiles WHERE id = auth.uid();
  IF v_sender_name IS NULL THEN v_sender_name := 'O administrador'; END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.permission != OLD.permission THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        'Permissão Atualizada',
        v_sender_name || ' alterou sua permissão para ' || UPPER(NEW.permission) || ' no projeto ' || v_project_name,
        'system',
        '/project/' || NEW.project_id
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- ONLY insert notification if the user profile and project still exist (not cascading deletion of profile or project)
    IF EXISTS (SELECT 1 FROM profiles WHERE id = OLD.user_id) AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        OLD.user_id,
        'Acesso Removido',
        v_sender_name || ' removeu seu acesso ao projeto ' || v_project_name,
        'system',
        '/projects'
      );
    END IF;
  END IF;

  RETURN NULL; -- For AFTER triggers, we return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_project_deletion_for_slots to check if profile exists before updating slots
CREATE OR REPLACE FUNCTION handle_project_deletion_for_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o projeto era premium e já havia sido utilizado, a vaga não volta pro estoque
  IF OLD.is_free = false AND OLD.is_used = true THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE id = OLD.owner_id) THEN
      UPDATE profiles 
      SET consumed_premium_slots = COALESCE(consumed_premium_slots, 0) + 1 
      WHERE id = OLD.owner_id;
    END IF;
  END IF;
  
  -- Se o projeto era gratuito e nunca foi utilizado, ele devolve a vaga gratuita 
  IF OLD.is_free = true AND OLD.is_used = false THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE id = OLD.owner_id) THEN
      UPDATE profiles 
      SET free_slot_consumed = false 
      WHERE id = OLD.owner_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
