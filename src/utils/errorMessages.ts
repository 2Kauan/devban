/**
 * Traduz e formata qualquer objeto ou mensagem de erro para um texto amigável em português.
 * Remove jargões técnicos, códigos de erro, termos em inglês e mensagens internas do banco de dados.
 */
export function getFriendlyErrorMessage(error: any, fallbackMessage: string = 'Ocorreu um erro ao processar sua solicitação.'): string {
  if (!error) return fallbackMessage;

  const rawMessage = typeof error === 'string' 
    ? error 
    : (error.message || error.error_description || error.details || error.hint || '');

  if (!rawMessage || typeof rawMessage !== 'string') return fallbackMessage;

  const lower = rawMessage.toLowerCase();

  // Erros de conexão / rede
  if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('failed to fetch') || lower.includes('offline') || lower.includes('connection')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
  }

  // Erros de permissão / acesso
  if (lower.includes('permission denied') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('row-level security') || lower.includes('rls')) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  // Erros de autenticação / sessão
  if (lower.includes('jwt expired') || lower.includes('session expired') || lower.includes('invalid claim') || lower.includes('token expired') || lower.includes('not authenticated')) {
    return 'Sua sessão expirou. Por favor, faça login novamente.';
  }

  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos.';
  }

  if (lower.includes('user_already_exists') || lower.includes('already registered') || lower.includes('already exists')) {
    return 'Esta informação ou e-mail já está cadastrado no sistema.';
  }

  // Erros de restrição do banco de dados / duplicidade
  if (lower.includes('unique constraint') || lower.includes('duplicate key')) {
    return 'Já existe um registro com estes dados no sistema.';
  }

  if (lower.includes('foreign key constraint') || lower.includes('violates foreign key')) {
    return 'Esta ação não pode ser concluída pois existem dados vinculados a ela.';
  }

  if (lower.includes('not-null constraint') || lower.includes('null value in column')) {
    return 'Por favor, preencha todos os campos obrigatórios.';
  }

  if (lower.includes('value too long') || lower.includes('character varying')) {
    return 'O texto digitado ultrapassa o limite permitido. Reduza o tamanho e tente novamente.';
  }

  // Erros de arquivo / upload
  if (lower.includes('file size') || lower.includes('payload too large') || lower.includes('maximum size')) {
    return 'O arquivo selecionado é muito grande. Escolha um arquivo menor.';
  }

  if (lower.includes('invalid file type') || lower.includes('mime type') || lower.includes('format not supported')) {
    return 'Formato de arquivo não suportado.';
  }

  // Verificar se a mensagem contém jargões técnicos ou termos de código em inglês
  const containsCodeOrJargon = /([A-Za-z0-9_]+Error|PG::|SQL|select|insert|update|delete|column|relation|syntax|uuid|json|http|status \d+|stack|trace)/i.test(rawMessage);
  
  if (!containsCodeOrJargon && rawMessage.trim().length > 0 && !/[a-zA-Z]{20,}/.test(rawMessage)) {
    // É uma mensagem já formatada em linguagem humana
    return rawMessage.trim();
  }

  return fallbackMessage;
}
