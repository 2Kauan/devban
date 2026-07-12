/**
 * Traduz mensagens de erro comuns do Supabase Auth para português.
 */
export function translateAuthError(message: string): string {
  if (!message) return 'Ocorreu um erro inesperado.';

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }
  
  if (lowerMessage.includes('user already registered') || lowerMessage.includes('user_already_exists')) {
    return 'Este e-mail já está cadastrado.';
  }

  if (lowerMessage.includes('new password should be different')) {
    return 'A nova senha deve ser diferente da senha antiga.';
  }

  if (lowerMessage.includes('for security purposes, you can only request this after')) {
    const seconds = message.match(/\d+/)?.[0] || 'alguns';
    return `Por motivos de segurança, você só pode solicitar isso novamente após ${seconds} segundos.`;
  }

  if (lowerMessage.includes('email not confirmed')) {
    return 'Por favor, confirme seu e-mail antes de fazer login.';
  }

  if (lowerMessage.includes('signup not allowed') || lowerMessage.includes('signups not allowed')) {
    return 'Novos cadastros não estão permitidos no momento.';
  }

  if (lowerMessage.includes('invalid grant') || lowerMessage.includes('flow state not found')) {
    return 'O link de confirmação é inválido ou já expirou.';
  }

  if (lowerMessage.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  // Fallback para mensagens em inglês genéricas
  return message;
}
