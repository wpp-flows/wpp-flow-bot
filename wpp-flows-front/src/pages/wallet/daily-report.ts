import type { DailyReportDetail } from '@/types';
import {
  PAYMENT_LABEL,
  STATUS_LABEL,
  formatBRL,
  formatDayLabel,
  orderNumber,
  paymentProviderLabel,
} from '../../helpers/order-helpers';

interface DailyReportInput {
  organizationName: string;
  /** Server-built payload: header info + summary aggregates + the day's orders. */
  report: DailyReportDetail;
}

/**
 * Opens a new print-ready window with the daily orders report. Mirrors the
 * existing wallet-report flow (HTML blob URL + window.print). The user gets
 * the system print dialog and can "Save as PDF".
 *
 * Everything but the rendering is server-built — `report.summary` aggregates
 * come straight from Postgres so the printed numbers match the wallet list
 * exactly.
 */
export function openDailyReport({
  organizationName,
  report,
}: DailyReportInput): void {
  const html = buildDailyReportHtml({ organizationName, report });
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const win = globalThis.open(url, '_blank', 'width=900,height=1100');
  if (!win) {
    URL.revokeObjectURL(url);
    return;
  }
  win.addEventListener('load', () => {
    win.focus();
    win.print();
  });
  win.addEventListener('pagehide', () => URL.revokeObjectURL(url));
}

export function buildDailyReportHtml({
  organizationName,
  report,
}: DailyReportInput): string {
  const dayLabel = formatDayLabel(report.date);
  const generatedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rows = report.orders
    .map((order) => {
      const time = new Date(order.createdAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const items = order.items
        .map((it) => `${it.qty}× ${escapeHtml(it.name)}`)
        .join(', ');
      const paymentMethod = paymentProviderLabel(order.paymentProvider);
      const paid = order.paymentStatus === 'PAID' ? '✓' : '—';
      return `
        <tr>
          <td class="mono">${orderNumber(order.sequence)}</td>
          <td>${time}</td>
          <td class="items">${items}</td>
          <td>${paymentMethod}</td>
          <td class="status">${paid} ${escapeHtml(PAYMENT_LABEL[order.paymentStatus])}</td>
          <td class="status">${escapeHtml(STATUS_LABEL[order.status])}</td>
          <td class="amt">${formatBRL(order.total)}</td>
        </tr>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório diário · ${escapeHtml(dayLabel)} · ${escapeHtml(organizationName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 24px; }
    .summary { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
    .summary .card { flex: 1 1 160px; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .summary .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .summary .value { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 20px; font-weight: 600; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th { font-weight: 600; color: #475569; background: #f8fafc; border-bottom: 1px solid #cbd5e1; }
    td.amt, th.amt { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    td.items { color: #334155; max-width: 320px; }
    .status { text-transform: capitalize; font-size: 11px; color: #475569; }
    tfoot td { font-weight: 600; background: #f8fafc; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; }
    @media print { body { margin: 16mm; } .summary { break-inside: avoid; } thead { display: table-header-group; } }
  </style>
</head>
<body>
  <h1>Relatório diário</h1>
  <p class="meta">${escapeHtml(organizationName)} · ${escapeHtml(dayLabel)} · gerado em ${generatedAt}</p>

  <div class="summary">
    <div class="card">
      <div class="label">Pedidos</div>
      <div class="value">${report.summary.count}</div>
    </div>
    <div class="card">
      <div class="label">Faturamento</div>
      <div class="value">${formatBRL(report.summary.revenue)}</div>
    </div>
    <div class="card">
      <div class="label">Pago (recebido)</div>
      <div class="value">${formatBRL(report.summary.paidRevenue)}</div>
    </div>
    <div class="card">
      <div class="label">Em dinheiro</div>
      <div class="value">${report.summary.cashCount} pedidos</div>
    </div>
    <div class="card">
      <div class="label">Cancelados</div>
      <div class="value">${report.summary.canceledCount}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Pedido</th>
        <th>Hora</th>
        <th>Itens</th>
        <th>Pagamento</th>
        <th>Status pagto.</th>
        <th>Status pedido</th>
        <th class="amt">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px;">Nenhum pedido neste dia.</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6">Total do dia</td>
        <td class="amt">${formatBRL(report.summary.revenue)}</td>
      </tr>
    </tfoot>
  </table>

  <p class="footer">Relatório gerado pelo painel · valores em BRL.</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
