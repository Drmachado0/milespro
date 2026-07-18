import { logger } from '@/lib/logger';

/**
 * Sanitizes database and API error messages to prevent
 * leaking internal system information to users.
 */
export function sanitizeError(error: unknown): string {
  const errorStr = error instanceof Error 
    ? error.message 
    : String(error || '');
  
  const lowerError = errorStr.toLowerCase();

  // Foreign key violations
  if (lowerError.includes('foreign key') || lowerError.includes('violates foreign key')) {
    return 'Este item está vinculado a outros registros e não pode ser removido.';
  }

  // Unique constraint violations
  if (lowerError.includes('unique constraint') || lowerError.includes('duplicate key')) {
    return 'Este registro já existe.';
  }

  // Not null violations
  if (lowerError.includes('not null') || lowerError.includes('null value')) {
    return 'Campos obrigatórios estão faltando.';
  }

  // RLS / Permission denied
  if (lowerError.includes('permission denied') || lowerError.includes('row-level security')) {
    return 'Você não tem permissão para esta ação.';
  }

  // Storage errors
  if (lowerError.includes('storage') || lowerError.includes('bucket')) {
    return 'Erro ao processar o arquivo.';
  }

  // Network errors
  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet.';
  }

  // Authentication errors
  if (lowerError.includes('not authenticated') || lowerError.includes('jwt')) {
    return 'Sessão expirada. Faça login novamente.';
  }

  // Check constraint violations
  if (lowerError.includes('check constraint')) {
    return 'Dados inválidos. Verifique os valores informados.';
  }

  // Log the original error for debugging (only in development)
  logger.error('[ErrorSanitizer]', 'Sanitized error:', error);

  // Generic fallback
  return 'Ocorreu um erro. Tente novamente.';
}

/**
 * Check if an error message contains a specific user-facing message
 * (e.g., custom business logic errors that should be shown as-is)
 */
export function isUserFacingError(error: unknown): boolean {
  const errorStr = error instanceof Error ? error.message : String(error || '');
  
  // These are custom error messages that should be shown to users
  const userFacingPatterns = [
    'limite de',
    'plano gratuito',
    'faça upgrade',
    'usuário não autenticado',
  ];

  return userFacingPatterns.some(pattern => 
    errorStr.toLowerCase().includes(pattern)
  );
}

/**
 * Get a safe error message - either the original if it's user-facing,
 * or a sanitized version if it's a system error.
 */
export function getSafeErrorMessage(error: unknown): string {
  if (isUserFacingError(error)) {
    return error instanceof Error ? error.message : String(error);
  }
  return sanitizeError(error);
}
