-- Funções com SECURITY DEFINER executam ignorando RLS (Row Level Security),
-- isso quebra o loop infinito de recursão entre as tabelas.

-- 1. Helper para verificar se o usuário é membro do projeto
CREATE OR REPLACE FUNCTION public.is_project_member(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper para verificar se o usuário é dono do projeto
CREATE OR REPLACE FUNCTION public.is_project_owner(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects WHERE id = pid AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualiza as políticas de "projects"
DROP POLICY IF EXISTS "Users can view projects they own or are members of" ON projects;
CREATE POLICY "Users can view projects they own or are members of" ON projects FOR SELECT USING (
  owner_id = auth.uid() OR 
  is_project_member(id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  share_enabled = true
);

-- 4. Atualiza as políticas de "project_members"
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
CREATE POLICY "Users can view members of their projects" ON project_members FOR SELECT USING (
  user_id = auth.uid() OR
  is_project_owner(project_id) OR
  is_project_member(project_id)
);

-- 5. Atualiza a política de UPDATE de "projects" para usar as funções
DROP POLICY IF EXISTS "Users can update their own projects or if they are editors" ON projects;
CREATE POLICY "Users can update their own projects or if they are editors" ON projects FOR UPDATE USING (
  owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND permission = 'editor') OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
