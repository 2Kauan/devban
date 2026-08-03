-- Remover a trigger que marca o projeto como usado quando uma coluna é inserida
-- Isso evita que novos projetos fiquem bloqueados só pelas 5 colunas padrão
DROP TRIGGER IF EXISTS mark_project_used_on_column ON columns;

-- Atualizar projetos que foram marcados como usados indevidamente
-- Só consideramos usados se tiverem cards, categorias, ou checklist_items.
UPDATE projects p
SET is_used = false
WHERE is_used = true
  AND NOT EXISTS (SELECT 1 FROM cards c WHERE c.project_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM categories cat WHERE cat.project_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM checklists chk JOIN cards c ON chk.card_id = c.id WHERE c.project_id = p.id);

-- E também resetar o free_slot_consumed se o projeto não está mais usado
UPDATE profiles pr
SET free_slot_consumed = false
FROM projects p
WHERE p.owner_id = pr.id
  AND p.is_free = true
  AND p.is_used = false;
