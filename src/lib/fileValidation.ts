/**
 * File validation utilities for secure uploads
 */

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp'
] as const;

export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedExtensions?: readonly string[];
  allowedMimeTypes?: readonly string[];
}

/**
 * Validates an image file for upload
 */
export function validateImageFile(
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSize = DEFAULT_MAX_FILE_SIZE,
    allowedExtensions = ALLOWED_IMAGE_EXTENSIONS,
    allowedMimeTypes = ALLOWED_IMAGE_MIME_TYPES,
  } = options;

  // Check file extension
  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop();
  
  if (!ext || !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Apenas arquivos ${allowedExtensions.join(', ').toUpperCase()} são permitidos.`,
    };
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type as typeof allowedMimeTypes[number])) {
    return {
      valid: false,
      error: 'Tipo de arquivo inválido. Por favor, selecione uma imagem válida.',
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `O arquivo deve ter no máximo ${maxSizeMB}MB.`,
    };
  }

  // Additional security: check for suspicious file names
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return {
      valid: false,
      error: 'Nome de arquivo inválido.',
    };
  }

  return { valid: true };
}

/**
 * Validates a file for avatar upload (stricter size limit)
 */
export function validateAvatarFile(file: File): FileValidationResult {
  return validateImageFile(file, {
    maxSize: AVATAR_MAX_FILE_SIZE,
  });
}

/**
 * Gets a safe file extension from a file name
 */
export function getSafeFileExtension(fileName: string): string | null {
  const ext = fileName.toLowerCase().split('.').pop();
  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.includes(ext as typeof ALLOWED_IMAGE_EXTENSIONS[number])) {
    return null;
  }
  return ext;
}
