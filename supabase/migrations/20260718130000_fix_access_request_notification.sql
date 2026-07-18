-- Ensure the access request notification trigger exists and works correctly
-- The original migration (20260711184500) was UTF-16 encoded and may not have been applied

CREATE OR REPLACE FUNCTION create_notification_on_access_request()
RETURNS trigger AS $$
DECLARE
  v_project_name TEXT;
  v_owner_id UUID;
  v_actor_name TEXT;
BEGIN
  SELECT name, owner_id INTO v_project_name, v_owner_id FROM projects WHERE id = NEW.project_id;
  
  -- Don't notify if the requester is the owner
  IF NEW.user_id = v_owner_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_actor_name FROM profiles WHERE id = NEW.user_id;
  IF v_actor_name IS NULL OR v_actor_name = '' THEN
    v_actor_name := 'Alguém';
  END IF;

  INSERT INTO notifications (user_id, actor_id, project_id, type, title, message, link)
  VALUES (
    v_owner_id,
    NEW.user_id,
    NEW.project_id,
    'system',
    'Nova solicitação de acesso',
    v_actor_name || ' solicitou acesso ao projeto "' || v_project_name || '".',
    '/project/' || NEW.project_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_access_request_notification ON project_access_requests;
CREATE TRIGGER on_access_request_notification
  AFTER INSERT ON project_access_requests
  FOR EACH ROW EXECUTE PROCEDURE create_notification_on_access_request();
