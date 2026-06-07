import { useMutation } from '@tanstack/react-query';
import { FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/stores/uiStore';
import { reportService } from '@/services/reportService';
import type { DailyReportSummary, WalletServiceType } from '@/types';
import {
  formatBRL,
  formatDayLabel,
  isToday,
} from '../../../helpers/order-helpers';
import { openDailyReport } from '../daily-report';

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
  const download = useMutation({
    mutationFn: (date: string) =>
      reportService.getDaily(date, { serviceType }),
    onSuccess: (detail) => {
      openDailyReport({ organizationName, report: detail });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : 'Falha ao carregar o relatório',
      ),
  });

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
    <div className="space-y-2">
      {reports.map((bucket) => {
        const today = isToday(`${bucket.date}T12:00:00`);
        const revenue = Number.parseFloat(bucket.revenue || '0');
        const downloading =
          download.isPending && download.variables === bucket.date;
        return (
          <Card
            key={bucket.date}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
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
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText />}
              loading={downloading}
              disabled={download.isPending && !downloading}
              onClick={() => download.mutate(bucket.date)}
            >
              Baixar PDF
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
