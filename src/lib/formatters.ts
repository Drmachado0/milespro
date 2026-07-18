// Brazilian number and currency formatters

export function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatNumberBR(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function parseCurrencyBR(value: string): number {
  // Remove currency symbol, dots (thousands) and replace comma with dot
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function parseNumberBR(value: string): number {
  // Remove dots (thousands) and replace comma with dot
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function formatCurrencyInputBR(value: string): string {
  // Remove non-numeric characters except comma
  let cleaned = value.replace(/[^\d,]/g, '');
  
  // Ensure only one comma
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }
  
  // Limit decimal places to 2
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + ',' + parts[1].slice(0, 2);
  }
  
  // Add thousand separators to integer part
  if (parts[0].length > 3) {
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    cleaned = parts.length === 2 ? intPart + ',' + parts[1] : intPart;
  }
  
  return cleaned;
}

export function formatNumberInputBR(value: string): string {
  // Remove non-numeric characters
  const cleaned = value.replace(/\D/g, '');
  
  // Add thousand separators
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatDateBR(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('pt-BR');
}

// CPF: 000.000.000-00
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// CNPJ: 00.000.000/0000-00
export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// Telefone: (00) 00000-0000 ou (00) 0000-0000
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

// CEP: 00000-000
export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

// pt-BR proper-name title case ("juliano silva machado" → "Juliano Silva Machado",
// "joão da silva" → "João da Silva"). Display-only — does not mutate stored data.
//
// Prepositions/articles ("de", "da", "do", "dos", "das", "e") stay lowercase
// per Brazilian Portuguese name convention, EXCEPT when they are the first token.
// Tokens containing digits, all-caps acronyms (≤3 chars), or initials with a
// trailing dot are passed through unchanged so things like "ID 7", "USP", "M."
// survive intact.
const NAME_LOWERCASE_TOKENS = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);

export function toTitleCase(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/(\s+)/)
    .map((segment, index) => {
      if (/^\s+$/.test(segment)) return segment;
      const lower = segment.toLowerCase();
      // Preserve all-caps acronyms (USP, ONU) and tokens with digits.
      if (/\d/.test(segment)) return segment;
      if (segment.length <= 3 && segment === segment.toUpperCase() && /[A-Z]/.test(segment)) {
        return segment;
      }
      // First non-whitespace token always capitalizes.
      if (index !== 0 && NAME_LOWERCASE_TOKENS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
    })
    .join('');
}
