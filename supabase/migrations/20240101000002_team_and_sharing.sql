-- Create RPC for joining a project by share token
CREATE OR REPLACE FUNCTION join_project_by_token(p_token UUID)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
BEGIN
  -- Validate user is logged in
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find project
  SELECT id, owner_id INTO v_project_id, v_owner_id
  FROM projects
  WHERE share_token = p_token AND share_enabled = true;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or disabled share token';
  END IF;

  -- If user is owner, just return project id
  IF v_owner_id = auth.uid() THEN
    RETURN v_project_id;
  END IF;

  -- Add to project_members if not exists (default permission: editor)
  INSERT INTO project_members (project_id, user_id, permission)
  VALUES (v_project_id, auth.uid(), 'editor')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS for public read-only access to shared projects
CREATE POLICY "Public can view shared projects" ON projects FOR SELECT USING (share_enabled = true);
CREATE POLICY "Public can view shared project columns" ON columns FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND share_enabled = true)
);
CREATE POLICY "Public can view shared project cards" ON cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND share_enabled = true)
);
