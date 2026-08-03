-- Update RPC for joining a project by share token to respect share_permission
CREATE OR REPLACE FUNCTION join_project_by_token(p_token UUID)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
  v_share_permission TEXT;
  v_project_permission project_permission;
BEGIN
  -- Validate user is logged in
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find project and its permission level
  SELECT id, owner_id, share_permission INTO v_project_id, v_owner_id, v_share_permission
  FROM projects
  WHERE share_token = p_token AND share_enabled = true;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or disabled share token';
  END IF;

  -- If user is owner, just return project id
  IF v_owner_id = auth.uid() THEN
    RETURN v_project_id;
  END IF;

  -- Map share_permission to project_permission
  IF v_share_permission = 'edit' THEN
    v_project_permission := 'editor';
  ELSE
    v_project_permission := 'viewer';
  END IF;

  -- Add to project_members if not exists, otherwise update their permission if the link grants higher access?
  -- For now, just insert or do nothing if already a member.
  INSERT INTO project_members (project_id, user_id, permission)
  VALUES (v_project_id, auth.uid(), v_project_permission)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
