-- Fix: Allow admins to manage project members (not just owners)
DROP POLICY IF EXISTS "Project Members All" ON project_members;

CREATE OR REPLACE FUNCTION public.get_is_project_admin(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid() AND permission = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Project Members All" ON project_members FOR ALL USING (
  get_is_project_owner(project_id) OR
  get_is_project_admin(project_id)
);
