-- Drop old policies to completely clean up recursion
DROP POLICY IF EXISTS "Users can view projects they own or are members of" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects or if they are editors" ON projects;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Owners can manage members" ON project_members;

-- 1. Create secure helper functions (plpgsql prevents query inlining which causes recursion)
CREATE OR REPLACE FUNCTION public.get_is_project_member(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_is_project_owner(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM projects WHERE id = pid AND owner_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_is_project_editor(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid() AND permission = 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Projects Policies
CREATE POLICY "Projects Select" ON projects FOR SELECT USING (
  owner_id = auth.uid() OR 
  share_enabled = true OR 
  get_is_project_member(id)
);

CREATE POLICY "Projects Update" ON projects FOR UPDATE USING (
  owner_id = auth.uid() OR 
  get_is_project_editor(id)
);

-- 3. Project Members Policies
CREATE POLICY "Project Members Select" ON project_members FOR SELECT USING (
  user_id = auth.uid() OR
  get_is_project_owner(project_id) OR
  get_is_project_member(project_id)
);

CREATE POLICY "Project Members All" ON project_members FOR ALL USING (
  get_is_project_owner(project_id) OR
  EXISTS (SELECT 1 FROM project_members WHERE project_id = project_members.project_id AND user_id = auth.uid() AND permission = 'admin')
);
