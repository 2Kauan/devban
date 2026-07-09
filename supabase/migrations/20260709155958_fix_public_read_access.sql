-- Atualiza a função user_can_read_project para permitir que usuários públicos (convidados do link) vejam os dados do projeto se o share_enabled estiver ativo
CREATE OR REPLACE FUNCTION user_can_read_project(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = pid AND (
      owner_id = auth.uid() OR 
      share_enabled = true OR
      EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid())
    )
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualiza a política de project_members para permitir que convidados vejam quem são os membros
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
CREATE POLICY "Users can view members of their projects" ON project_members FOR SELECT USING (
  user_can_read_project(project_id)
);
