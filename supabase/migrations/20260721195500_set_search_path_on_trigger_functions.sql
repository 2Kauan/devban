-- 1. Redefine notify_member_permission_update with search_path = public
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Redefine handle_project_deletion_for_slots with search_path = public
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Redefine create_notification_on_project_invite with search_path = public
CREATE OR REPLACE FUNCTION create_notification_on_project_invite()
RETURNS trigger AS $$
DECLARE
  v_project_name TEXT;
  v_actor_name TEXT;
BEGIN
  -- Não notificar o usuário se ele mesmo estiver se adicionando (ex: dono do projeto ao criar)
  IF NEW.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do projeto
  SELECT name INTO v_project_name FROM projects WHERE id = NEW.project_id;
  
  -- Buscar nome de quem convidou
  SELECT name INTO v_actor_name FROM profiles WHERE id = auth.uid();
  
  IF v_actor_name IS NULL OR v_actor_name = '' THEN
    v_actor_name := 'Alguém';
  END IF;

  INSERT INTO notifications (user_id, actor_id, project_id, type, title, message, link)
  VALUES (
    NEW.user_id,
    auth.uid(),
    NEW.project_id,
    'project_invite',
    'Novo projeto',
    v_actor_name || ' adicionou você ao projeto "' || v_project_name || '".',
    '/project/' || NEW.project_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Redefine create_notification_on_access_request with search_path = public
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
