-- Project Access Requests Table
CREATE TABLE project_access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- RLS
ALTER TABLE project_access_requests ENABLE ROW LEVEL SECURITY;

-- Project owners can view and manage requests for their projects
CREATE POLICY "Owners can manage access requests" ON project_access_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_access_requests.project_id AND owner_id = auth.uid())
);

-- Users can view their own requests
CREATE POLICY "Users can view own access requests" ON project_access_requests FOR SELECT USING (
  user_id = auth.uid()
);

-- Users can insert their own requests if the project allows sharing
CREATE POLICY "Users can request access to shared projects" ON project_access_requests FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND share_enabled = true)
);

-- Update the RPC to use the new request table instead of directly adding members
CREATE OR REPLACE FUNCTION join_project_by_token(p_token UUID)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
  v_share_permission TEXT;
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

  -- If user is already a member, just return project id
  IF EXISTS (SELECT 1 FROM project_members WHERE project_id = v_project_id AND user_id = auth.uid()) THEN
    RETURN v_project_id;
  END IF;

  -- Instead of adding to project_members directly, we create an access request
  -- (If there's already a request, we just ignore the conflict and return the project id)
  INSERT INTO project_access_requests (project_id, user_id, status)
  VALUES (v_project_id, auth.uid(), 'pending')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
