-- Cria a função para permitir que um usuário autenticado delete sua própria conta
-- SECURITY DEFINER é usado para permitir a exclusão na tabela auth.users, já que apenas admins têm acesso a ela.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Obtém o ID do usuário atualmente autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Remove o usuário da tabela auth.users (isso vai cascatear para public.profiles, etc, dependendo de como as FKs estão configuradas)
  -- Mas o mais seguro é apenas excluir de auth.users, que o Supabase cuida de limpar de lá.
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
