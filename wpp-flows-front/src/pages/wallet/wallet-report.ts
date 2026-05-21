import type { Wallet, WalletTransaction } from '@/types';
import { formatBRL, formatDateTime, TX_KIND_LABEL, TX_STATUS_LABEL } from './wallet-helpers';

interface ReportInput {
  organizationName: string;
  wallet: Wallet;
  transactions: WalletTransaction[];
}


export function openWalletReport({ organizationName, wallet, transactions }: ReportInput): void {
  const html = buildReportHtml({ organizationName, wallet, transactions });
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

function buildReportHtml({ organizationName, wallet, transactions }: ReportInput): string {
  const generatedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const credits = transactions.filter((t) => t.kind === 'CREDIT' && t.status === 'COMPLETED');
  const totalCredited = credits.reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);

  const rows = transactions
    .map((tx) => {
      const sign = tx.kind === 'CREDIT' ? '+' : '−';
      return `
        <tr>
          <td>${formatDateTime(tx.createdAt)}</td>
          <td>${TX_KIND_LABEL[tx.kind]}</td>
          <td class="status">${TX_STATUS_LABEL[tx.status]}</td>
          <td>${escapeHtml(tx.note ?? '')}</td>
          <td class="amt ${tx.kind === 'CREDIT' ? 'credit' : ''}">${sign} ${formatBRL(tx.amount)}</td>
        </tr>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório financeiro · ${escapeHtml(organizationName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 24px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; }
    .summary .card { flex: 1; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .summary .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .summary .value { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 22px; font-weight: 600; margin-top: 4px; }
    .info { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #78350f; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th { font-weight: 600; color: #475569; background: #f8fafc; border-bottom: 1px solid #cbd5e1; }
    .amt { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .amt.credit { color: #15803d; }
    .status { text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; color: #475569; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; }
    @media print { body { margin: 16mm; } .summary { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>Relatório financeiro</h1>
  <p class="meta">${escapeHtml(organizationName)} · gerado em ${generatedAt}</p>

  <div class="info">
    Os valores recebidos por pedidos pagos via Mercado Pago ficam na sua conta MP.
    Para sacar, acesse o painel ou aplicativo do Mercado Pago.
  </div>

  <div class="summary">
    <div class="card">
      <div class="label">Saldo na carteira</div>
      <div class="value">${formatBRL(wallet.balance)}</div>
    </div>
    <div class="card">
      <div class="label">Total creditado (${credits.length} pedidos)</div>
      <div class="value">${formatBRL(totalCredited)}</div>
    </div>
    <div class="card">
      <div class="label">Movimentações</div>
      <div class="value">${transactions.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Observação</th>
        <th class="amt">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">Sem movimentações no período.</td></tr>'}
    </tbody>
  </table>

  <p class="footer">Relatório gerado pelo painel · valores em ${escapeHtml(wallet.currency)}.</p>
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
