import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/stores/uiStore';
import { reportService } from '@/services/reportService';
import type { DailyReportDetail, DailyReportSummary, WalletServiceType } from '@/types';
import {
  formatBRL,
  formatDayLabel,
  isToday,
} from '../../../helpers/order-helpers';
import { ReportPreviewModal } from './ReportPreviewModal';

interface Props {
  organizationName: string;
  reports: DailyReportSummary[];
  serviceType?: WalletServiceType;
}

export function DailyReportsList({
  organizationName,
  reports,
  serviceType,
}: Readonly<Props>) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<DailyReportDetail | null>(null);

  const load = useMutation({
    mutationFn: (date: string) =>
      reportService.getDaily(date, { serviceType }),
    onSuccess: (result) => setDetail(result),
    onError: (err) => {
      setOpenDate(null);
      toast.error(
        err instanceof Error ? err.message : 'Falha ao carregar o relatório',
      );
    },
  });

  const handleOpen = (date: string) => {
    setOpenDate(date);
    setDetail(null);
    load.mutate(date);
  };

  const handleClose = () => {
    setOpenDate(null);
    setDetail(null);
  };

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<Calendar />}
        title="Sem relatórios ainda"
        description="Os relatórios aparecem aqui assim que houver pedidos confirmados."
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {reports.map((bucket) => {
          const today = isToday(`${bucket.date}T12:00:00`);
          const revenue = Number.parseFloat(bucket.revenue || '0');
          const isLoadingThis = load.isPending && openDate === bucket.date;
          return (
            <Card
              key={bucket.date}
              role="button"
              tabIndex={0}
              onClick={() => handleOpen(bucket.date)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpen(bucket.date);
                }
              }}
              className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
              aria-busy={isLoadingThis}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium tracking-tight">
                      {formatDayLabel(bucket.date)}
                    </p>
                    {today ? (
                      <Badge tone="info" size="sm">
                        Hoje (parcial)
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bucket.count} pedido{bucket.count === 1 ? '' : 's'} ·{' '}
                    <span className="font-mono">{formatBRL(revenue)}</span>
                    {bucket.cashCount > 0 ? (
                      <> · {bucket.cashCount} em dinheiro</>
                    ) : null}
                    {bucket.canceledCount > 0 ? (
                      <> · {bucket.canceledCount} cancelado{bucket.canceledCount === 1 ? '' : 's'}</>
                    ) : null}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-primary">
                Ver relatório →
              </span>
            </Card>
          );
        })}
      </div>

      <ReportPreviewModal
        open={openDate != null}
        onClose={handleClose}
        organizationName={organizationName}
        report={detail}
        loading={load.isPending}
      />
    </>
  );
}
