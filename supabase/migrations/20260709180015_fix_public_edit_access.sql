-- Restaura a política de acesso público de edição (is_public = true AND public_edit = true)
-- que foi sobrescrita na migration 20240101000009.

CREATE OR REPLACE FUNCTION user_can_edit_project(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = pid AND (
      owner_id = auth.uid() OR 
      (share_enabled = true AND share_permission = 'edit') OR
      EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid() AND permission IN ('editor', 'admin'))
    )
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
