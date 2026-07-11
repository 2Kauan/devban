-- 1. Add free_slot_consumed to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS free_slot_consumed BOOLEAN DEFAULT false;

-- 2. Add is_used to projects
-- Note: is_completed might already be there from previous step, we add is_used here
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false;

-- 3. Trigger to mark project as used when entities are created
CREATE OR REPLACE FUNCTION mark_project_as_used()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Determine project_id based on the table
  IF TG_TABLE_NAME = 'columns' OR TG_TABLE_NAME = 'cards' OR TG_TABLE_NAME = 'project_members' OR TG_TABLE_NAME = 'categories' THEN
    v_project_id := NEW.project_id;
  ELSIF TG_TABLE_NAME = 'comments' OR TG_TABLE_NAME = 'attachments' OR TG_TABLE_NAME = 'checklists' THEN
    SELECT project_id INTO v_project_id FROM cards WHERE id = NEW.card_id;
  ELSIF TG_TABLE_NAME = 'checklist_items' THEN
    SELECT c.project_id INTO v_project_id FROM cards c JOIN checklists cl ON c.id = cl.card_id WHERE cl.id = NEW.checklist_id;
  END IF;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects SET is_used = true WHERE id = v_project_id AND is_used = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables
CREATE TRIGGER mark_project_used_on_column AFTER INSERT ON columns FOR EACH ROW EXECUTE PROCEDURE mark_project_as_used();
CREATE TRIGGER mark_project_used_on_card AFTER INSERT ON cards FOR EACH ROW EXECUTE PROCEDURE mark_project_as_used();
CREATE TRIGGER mark_project_used_on_member AFTER INSERT ON project_members FOR EACH ROW EXECUTE PROCEDURE mark_project_as_used();
CREATE TRIGGER mark_project_used_on_category AFTER INSERT ON categories FOR EACH ROW EXECUTE PROCEDURE mark_project_as_used();
CREATE TRIGGER mark_project_used_on_comment AFTER INSERT ON comments FOR EACH ROW EXECUTE PROCEDURE mark_project_as_used();
CREATE TRIGGER mark_project_used_on_attachment AFTER INSERT ON attachments FOR EACH ROW EXECUTE PROCEDURE mark_project_as_used();
CREATE TRIGGER mark_project_used_on_checklist AFTER INSERT ON checklists FOR EACH ROW EXECUTE PROCEDURE mark_project_as_used();
CREATE TRIGGER mark_project_used_on_checklist_item AFTER INSERT ON checklist_items FOR EACH ROW EXECUTE PROCEDURE mark_project_as_used();

-- 4. Trigger to mark profile's free slot as consumed when a free project becomes used
CREATE OR REPLACE FUNCTION consume_free_slot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_used = true AND OLD.is_used = false AND NEW.is_free = true THEN
    UPDATE profiles SET free_slot_consumed = true WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consume_free_slot_trigger AFTER UPDATE OF is_used ON projects FOR EACH ROW EXECUTE PROCEDURE consume_free_slot();
