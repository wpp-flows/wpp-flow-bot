import { useMemo, useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import type { DailyReportDetail } from '@/types';
import { formatDayLabel } from '../../../helpers/order-helpers';
import { buildDailyReportHtml } from '../daily-report';

interface Props {
  open: boolean;
  onClose: () => void;
  organizationName: string;
  report: DailyReportDetail | null;
  loading: boolean;
}

export function ReportPreviewModal({
  open,
  onClose,
  organizationName,
  report,
  loading,
}: Readonly<Props>) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = useMemo(() => {
    if (!report) return null;
    return buildDailyReportHtml({ organizationName, report });
  }, [organizationName, report]);

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        report
          ? `Relatório · ${formatDayLabel(report.date)}`
          : 'Relatório diário'
      }
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button
            leftIcon={<Printer />}
            onClick={handlePrint}
            disabled={!html}
          >
            Salvar PDF
          </Button>
        </>
      }
    >
      <div className="h-[70vh] w-full overflow-hidden rounded-md border border-border bg-card">
        {loading || !html ? (
          <div className="flex h-full items-center justify-center p-6">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title="Pré-visualização do relatório"
            className="h-full w-full border-0 bg-white"
            sandbox="allow-same-origin allow-modals"
          />
        )}
      </div>
    </Modal>
  );
}
