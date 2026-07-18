import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateImageFile,
  validateAvatarFile,
  getSafeFileExtension,
  DEFAULT_MAX_FILE_SIZE,
  AVATAR_MAX_FILE_SIZE,
} from './fileValidation';

function createFile(name: string, type: string, size: number): File {
  return new File(['x'.repeat(size)], name, { type });
}

describe('validateImageFile', () => {
  it('accepts valid JPG', () => {
    expect(validateImageFile(createFile('photo.jpg', 'image/jpeg', 1024)).valid).toBe(true);
  });
  it('rejects unsupported extension', () => {
    const r = validateImageFile(createFile('doc.pdf', 'application/pdf', 1024));
    expect(r.valid).toBe(false);
  });
  it('rejects oversized file', () => {
    const r = validateImageFile(createFile('photo.jpg', 'image/jpeg', DEFAULT_MAX_FILE_SIZE + 1));
    expect(r.valid).toBe(false);
  });
  it('rejects path traversal', () => {
    expect(validateImageFile(createFile('../evil.jpg', 'image/jpeg', 1024)).valid).toBe(false);
  });
});

describe('getSafeFileExtension', () => {
  it('extracts valid ext', () => { expect(getSafeFileExtension('photo.jpg')).toBe('jpg'); });
  it('null for non-image', () => { expect(getSafeFileExtension('doc.pdf')).toBeNull(); });
});
