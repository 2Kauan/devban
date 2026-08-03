-- Create ENUM type for notification types safely
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('project_invite', 'mention', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (user_id = auth.uid());
-- A inserção só é feita via triggers ou server-side, então não abrimos o insert público diretamente (se precisássemos, poderíamos).

-- Função para criar notificação ao ser adicionado a um projeto
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_project_invite_notification ON project_members;
CREATE TRIGGER on_project_invite_notification
  AFTER INSERT ON project_members
  FOR EACH ROW EXECUTE PROCEDURE create_notification_on_project_invite();

-- Adicionar notificações ao Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
