-- Remove a constraint existente que causa o delete cascade no log quando um cartão é excluído
ALTER TABLE card_activity_logs DROP CONSTRAINT IF EXISTS card_activity_logs_card_id_fkey;

-- Remove a restrição de "não nulo" para permitir logs de cartões que foram excluídos
ALTER TABLE card_activity_logs ALTER COLUMN card_id DROP NOT NULL;

-- Adiciona a nova constraint com "ON DELETE SET NULL", mantendo o log intacto
ALTER TABLE card_activity_logs 
  ADD CONSTRAINT card_activity_logs_card_id_fkey 
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL;
