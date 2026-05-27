export function formatBrl(value: number | string): string {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(n)) return 'R$ 0,00';
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

export function readAutofillFromQuery(search: string): {
  name: string;
  phone: string;
} {
  const params = new URLSearchParams(search);
  return {
    name: params.get('name')?.trim() ?? '',
    phone: params.get('phone')?.trim() ?? '',
  };
}

export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function buildWhatsAppLink(phoneDigits: string, message?: string): string {
  const base = `https://wa.me/${phoneDigits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
