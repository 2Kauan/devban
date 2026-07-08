-- 1. Permissões
ALTER TYPE project_permission ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE project_permission ADD VALUE IF NOT EXISTS 'client';

-- 2. Team Roles
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS job_title TEXT;

-- 3. Múltiplos responsáveis
CREATE TABLE IF NOT EXISTS card_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, user_id)
);

-- Migrar responsáveis antigos (assigned_to) para a nova tabela
INSERT INTO card_assignees (card_id, user_id)
SELECT id, assigned_to FROM cards WHERE assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

-- Remover a coluna antiga
ALTER TABLE cards DROP COLUMN IF EXISTS assigned_to;

-- Habilitar RLS na nova tabela
ALTER TABLE card_assignees ENABLE ROW LEVEL SECURITY;

-- 4. FIX DE SEGURANÇA GRAVE (Remover share_enabled genérico que causava vazamento)
DROP POLICY IF EXISTS "Projects Select" ON projects;
CREATE POLICY "Projects Select" ON projects FOR SELECT USING (
  owner_id = auth.uid() OR 
  get_is_project_member(id)
);

DROP POLICY IF EXISTS "Public can view shared projects" ON projects;
DROP POLICY IF EXISTS "Public can view shared project columns" ON columns;
DROP POLICY IF EXISTS "Public can view shared project cards" ON cards;

-- 5. Atualizar funções auxiliares de permissão
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
      EXISTS (SELECT 1 FROM project_members WHERE project_id = pid AND user_id = auth.uid() AND permission IN ('editor', 'admin'))
    )
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Políticas de RLS para card_assignees
CREATE POLICY "Users can view card assignees" ON card_assignees FOR SELECT USING (
  EXISTS (SELECT 1 FROM cards WHERE id = card_assignees.card_id AND user_can_read_project(project_id))
);
CREATE POLICY "Users can manage card assignees" ON card_assignees FOR ALL USING (
  EXISTS (SELECT 1 FROM cards WHERE id = card_assignees.card_id AND user_can_edit_project(project_id))
);

-- 7. Função RPC para buscar projeto público via token com segurança absoluta
CREATE OR REPLACE FUNCTION get_shared_project_data(p_token UUID)
RETURNS jsonb AS $$
DECLARE
  v_project jsonb;
  v_columns jsonb;
  v_cards jsonb;
BEGIN
  SELECT row_to_json(p) INTO v_project
  FROM projects p
  WHERE share_token = p_token AND share_enabled = true;
  
  IF v_project IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT json_agg(row_to_json(c)) INTO v_columns
  FROM columns c
  WHERE project_id = (v_project->>'id')::uuid;
  
  -- Para cards, precisamos buscar também as categorias e os responsáveis (assignees)
  -- Para simplificar, retornamos os cards brutos. A aplicação buscará o resto se necessário.
  SELECT json_agg(row_to_json(ca)) INTO v_cards
  FROM cards ca
  WHERE project_id = (v_project->>'id')::uuid;
  
  RETURN jsonb_build_object(
    'project', v_project,
    'columns', COALESCE(v_columns, '[]'::jsonb),
    'cards', COALESCE(v_cards, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
