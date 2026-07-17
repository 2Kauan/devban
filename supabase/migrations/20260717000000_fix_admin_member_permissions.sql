-- Fix: Allow admins to manage project members (not just owners)
DROP POLICY IF EXISTS "Project Members All" ON project_members;

CREATE POLICY "Project Members All" ON project_members FOR ALL USING (
  get_is_project_owner(project_id) OR
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.permission = 'admin'
  )
);
