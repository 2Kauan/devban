-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE share_permission AS ENUM ('view', 'edit');
CREATE TYPE card_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE payment_method AS ENUM ('pix', 'credit_card');
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'failed');
CREATE TYPE project_permission AS ENUM ('owner', 'editor', 'viewer');

-- Profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_free BOOLEAN DEFAULT true,
  payment_id TEXT,
  share_token UUID DEFAULT gen_random_uuid(),
  share_permission share_permission DEFAULT 'view',
  share_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission project_permission DEFAULT 'viewer' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Columns
CREATE TABLE columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  column_id UUID REFERENCES columns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority card_priority DEFAULT 'medium',
  border_color TEXT,
  position REAL NOT NULL,
  created_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card Categories
CREATE TABLE card_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(card_id, category_id)
);

-- Checklists
CREATE TABLE checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist Items
CREATE TABLE checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  checked BOOLEAN DEFAULT false,
  position REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments
CREATE TABLE attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  asaas_payment_id TEXT,
  value NUMERIC(10,2) NOT NULL,
  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  invoice_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card Activity Logs
CREATE TABLE card_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_columns_modtime BEFORE UPDATE ON columns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_cards_modtime BEFORE UPDATE ON cards FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_checklist_items_modtime BEFORE UPDATE ON checklist_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_comments_modtime BEFORE UPDATE ON comments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payments_modtime BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, name, email, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects Policies
CREATE POLICY "Users can view projects they own or are members of" ON projects FOR SELECT USING (
  auth.uid() = owner_id OR 
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects or if they are editors" ON projects FOR UPDATE USING (
  auth.uid() = owner_id OR 
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND permission = 'editor') OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Owners can delete projects" ON projects FOR DELETE USING (
  auth.uid() = owner_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Project Members Policies
CREATE POLICY "Users can view members of their projects" ON project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND (owner_id = auth.uid() OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())))
);

CREATE POLICY "Owners can manage members" ON project_members FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid())
);

-- Columns, Cards, Categories (Inherit Project Access)
-- Create a generic function to check project access
CREATE OR REPLACE FUNCTION user_can_read_project(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = pid AND (
      owner_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid())
    )
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_can_edit_project(pid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = pid AND (
      owner_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid() AND permission = 'editor')
    )
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Columns
CREATE POLICY "Users can view columns of their projects" ON columns FOR SELECT USING (user_can_read_project(project_id));
CREATE POLICY "Users can insert columns if editor" ON columns FOR INSERT WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Users can update columns if editor" ON columns FOR UPDATE USING (user_can_edit_project(project_id));
CREATE POLICY "Users can delete columns if editor" ON columns FOR DELETE USING (user_can_edit_project(project_id));

-- Cards
CREATE POLICY "Users can view cards of their projects" ON cards FOR SELECT USING (user_can_read_project(project_id));
CREATE POLICY "Users can insert cards if editor" ON cards FOR INSERT WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Users can update cards if editor" ON cards FOR UPDATE USING (user_can_edit_project(project_id));
CREATE POLICY "Users can delete cards if editor" ON cards FOR DELETE USING (user_can_edit_project(project_id));

-- Categories
CREATE POLICY "Users can view categories of their projects" ON categories FOR SELECT USING (user_can_read_project(project_id));
CREATE POLICY "Users can insert categories if editor" ON categories FOR INSERT WITH CHECK (user_can_edit_project(project_id));
CREATE POLICY "Users can update categories if editor" ON categories FOR UPDATE USING (user_can_edit_project(project_id));
CREATE POLICY "Users can delete categories if editor" ON categories FOR DELETE USING (user_can_edit_project(project_id));

-- Card Categories
CREATE POLICY "Users can view card categories" ON card_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM cards WHERE id = card_categories.card_id AND user_can_read_project(project_id))
);
CREATE POLICY "Users can manage card categories" ON card_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM cards WHERE id = card_categories.card_id AND user_can_edit_project(project_id))
);

-- Checklists
CREATE POLICY "Users can view checklists" ON checklists FOR SELECT USING (
  EXISTS (SELECT 1 FROM cards WHERE id = checklists.card_id AND user_can_read_project(project_id))
);
CREATE POLICY "Users can manage checklists" ON checklists FOR ALL USING (
  EXISTS (SELECT 1 FROM cards WHERE id = checklists.card_id AND user_can_edit_project(project_id))
);

-- Checklist Items
CREATE POLICY "Users can view checklist items" ON checklist_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM checklists c JOIN cards ca ON c.card_id = ca.id WHERE c.id = checklist_items.checklist_id AND user_can_read_project(ca.project_id))
);
CREATE POLICY "Users can manage checklist items" ON checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM checklists c JOIN cards ca ON c.card_id = ca.id WHERE c.id = checklist_items.checklist_id AND user_can_edit_project(ca.project_id))
);

-- Comments
CREATE POLICY "Users can view comments" ON comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM cards WHERE id = comments.card_id AND user_can_read_project(project_id))
);
CREATE POLICY "Users can insert comments if editor" ON comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM cards WHERE id = comments.card_id AND user_can_edit_project(project_id))
);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Attachments
CREATE POLICY "Users can view attachments" ON attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM cards WHERE id = attachments.card_id AND user_can_read_project(project_id))
);
CREATE POLICY "Users can insert attachments if editor" ON attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM cards WHERE id = attachments.card_id AND user_can_edit_project(project_id))
);
CREATE POLICY "Users can delete own attachments" ON attachments FOR DELETE USING (auth.uid() = uploaded_by);

-- Payments
CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Card Activity Logs
CREATE POLICY "Users can view logs" ON card_activity_logs FOR SELECT USING (user_can_read_project(project_id));
CREATE POLICY "Users can insert logs" ON card_activity_logs FOR INSERT WITH CHECK (user_can_edit_project(project_id));
