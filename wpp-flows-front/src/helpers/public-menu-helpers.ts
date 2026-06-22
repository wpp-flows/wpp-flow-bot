import type { PublicMenuItem } from '@/types/publicMenu';

export function effectiveItemPrice(item: PublicMenuItem): number {
  if (item.promotionalPrice) {
    const promo = Number.parseFloat(item.promotionalPrice);
    if (Number.isFinite(promo) && promo > 0) return promo;
  }
  return Number.parseFloat(item.price || '0');
}

export function originalDisplayPrice(item: PublicMenuItem): number | null {
  const raw =
    item.originalPrice ?? (item.promotionalPrice ? item.price : null);
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function startingPriceFor(item: PublicMenuItem): number {
  const base = effectiveItemPrice(item);
  const extras = item.optionGroups.reduce((sum, g) => {
    if (g.minSelections <= 0) return sum;
    const prices = g.options
      .map((o) => Number.parseFloat(o.additionalPrice || '0'))
      .sort((a, b) => a - b);
    const cheapest = prices.slice(0, g.minSelections);
    return sum + cheapest.reduce((s, p) => s + p, 0);
  }, 0);
  return base + extras;
}

export function itemShowsStartingFrom(item: PublicMenuItem): boolean {
  return startingPriceFor(item) > effectiveItemPrice(item);
}

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

/** Monta o endereço de entrega em uma linha para persistência no pedido. */
export function buildDeliveryAddress(parts: {
  street: string;
  number: string;
  neighborhood: string;
  notes?: string;
}): string {
  const street = parts.street.trim();
  const number = parts.number.trim();
  const neighborhood = parts.neighborhood.trim();
  const notes = parts.notes?.trim() ?? '';

  const main = [street, number].filter(Boolean).join(', ');
  let address = main;
  if (neighborhood) {
    address = address ? `${address} — ${neighborhood}` : neighborhood;
  }
  if (notes) {
    address = address ? `${address} (Obs: ${notes})` : `Obs: ${notes}`;
  }
  return address;
}
