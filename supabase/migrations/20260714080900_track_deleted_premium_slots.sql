-- Adiciona a coluna para contabilizar vagas premium que foram consumidas e cujos projetos foram excluídos
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consumed_premium_slots INTEGER DEFAULT 0;

-- Função para lidar com a exclusão de projetos
CREATE OR REPLACE FUNCTION handle_project_deletion_for_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o projeto era premium e já havia sido utilizado, a vaga não volta pro estoque
  IF OLD.is_free = false AND OLD.is_used = true THEN
    UPDATE profiles 
    SET consumed_premium_slots = COALESCE(consumed_premium_slots, 0) + 1 
    WHERE id = OLD.owner_id;
  END IF;
  
  -- Se o projeto era gratuito e nunca foi utilizado, ele devolve a vaga gratuita 
  -- (Essa parte já estava sendo feita parcialmente em outro lugar, mas é bom centralizar no Delete)
  IF OLD.is_free = true AND OLD.is_used = false THEN
    UPDATE profiles 
    SET free_slot_consumed = false 
    WHERE id = OLD.owner_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove a trigger se ela já existir para evitar duplicidade
DROP TRIGGER IF EXISTS project_deletion_slots_trigger ON projects;

-- Cria a trigger para rodar antes da exclusão do projeto
CREATE TRIGGER project_deletion_slots_trigger
BEFORE DELETE ON projects
FOR EACH ROW EXECUTE PROCEDURE handle_project_deletion_for_slots();
