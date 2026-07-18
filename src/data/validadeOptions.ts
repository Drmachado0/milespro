export const validadeOptions = [
  { value: 'none', label: 'Sem validade' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: '18', label: '18 meses' },
  { value: '24', label: '24 meses' },
  { value: '36', label: '36 meses' },
];

export const calculateValidityDate = (months: string): string | null => {
  if (months === 'none') return null;
  const date = new Date();
  date.setMonth(date.getMonth() + parseInt(months));
  return date.toISOString().split('T')[0];
};
