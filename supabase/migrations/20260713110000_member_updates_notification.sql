-- Trigger para atualizar quando a permissão for alterada ou removida

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
      INSERT INTO notifications (user_id, title, content, type, link)
      VALUES (
        NEW.user_id,
        'Permissão Atualizada',
        v_sender_name || ' alterou sua permissão para ' || UPPER(NEW.permission) || ' no projeto ' || v_project_name,
        'system',
        '/project/' || NEW.project_id
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (
      OLD.user_id,
      'Acesso Removido',
      v_sender_name || ' removeu seu acesso ao projeto ' || v_project_name,
      'system',
      '/projects'
    );
  END IF;

  RETURN NULL; -- For AFTER triggers, we return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_member_update_notification ON project_members;
CREATE TRIGGER on_project_member_update_notification
  AFTER UPDATE OR DELETE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_member_permission_update();
