-- Altera a função user_can_edit_project para permitir edição pública se o projeto permitir
CREATE OR REPLACE FUNCTION user_can_edit_project(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = pid AND (
      owner_id = auth.uid() OR 
      (share_enabled = true AND share_permission = 'edit') OR
      EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid() AND permission = 'editor')
    )
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adiciona a tabela projects no realtime para os clientes serem notificados quando a permissão mudar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE projects;
  END IF;
END $$;
