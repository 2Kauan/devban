-- Add projects and project_members to realtime publication
-- This is necessary to sync UI when owner changes permissions or approves access

ALTER PUBLICATION supabase_realtime ADD TABLE projects, project_members, project_access_requests;
