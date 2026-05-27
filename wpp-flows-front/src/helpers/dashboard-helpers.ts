export const formatBRL = (raw: string): string => {
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) return 'R$ 0,00';
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
};
