ALTER TABLE project_access_requests ADD COLUMN IF NOT EXISTS job_title TEXT;

CREATE OR REPLACE FUNCTION join_project_by_token(p_token UUID)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
  v_share_permission TEXT;
  v_job_title TEXT;
BEGIN
  -- Validate user is logged in
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get job title from user metadata
  SELECT raw_user_meta_data->>'job_title' INTO v_job_title FROM auth.users WHERE id = auth.uid();

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

  -- If user is already a member, just return project id
  IF EXISTS (SELECT 1 FROM project_members WHERE project_id = v_project_id AND user_id = auth.uid()) THEN
    RETURN v_project_id;
  END IF;

  -- Instead of adding to project_members directly, we create an access request
  INSERT INTO project_access_requests (project_id, user_id, status, job_title)
  VALUES (v_project_id, auth.uid(), 'pending', v_job_title)
  ON CONFLICT (project_id, user_id) DO UPDATE SET job_title = EXCLUDED.job_title;

  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
