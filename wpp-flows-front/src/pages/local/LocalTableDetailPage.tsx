import { useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Printer,
  Receipt,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { tableService } from "@/services/tableService";
import { orderService } from "@/services/orderService";
import { ROUTES } from "@/constants/app";
import { invalidateQueriesByFilters, queryKeys } from "@/lib/queryClient";
import { toast } from "@/stores/uiStore";
import { ApiError } from "@/instances/api";
import { useAuth } from "@/hooks/useAuth";
import type { Order, RestaurantTable } from "@/types";
import { OrderKanban } from "../orders/components/OrderKanban";
import { OrderDetail } from "../orders/components/OrderDetail";
import { CloseBillModal } from "./components/CloseBillModal";
import { formatBRL, orderNumber } from "@/helpers/order-helpers";

export function LocalTableDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [closingBill, setClosingBill] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tableQ = useQuery({
    queryKey: queryKeys.localTables.detail(id),
    queryFn: () => tableService.get(id),
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const ordersQ = useQuery({
    queryKey: queryKeys.localOrders.byTable(id),
    queryFn: () =>
      orderService.list({
        serviceType: "LOCAL",
        tableId: id,
        unbilledOnly: true,
      }),
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const table = tableQ.data;
  const orders = ordersQ.data ?? [];
  const billable = useMemo(
    () => orders.filter((o) => o.status !== "CANCELED"),
    [orders],
  );
  const runningTotal = useMemo(
    () =>
      billable.reduce((sum, o) => sum + Number.parseFloat(o.total || "0"), 0),
    [billable],
  );

  const advanceStatus = useMutation({
    mutationFn: ({
      id: orderId,
      status,
    }: {
      id: string;
      status: Order["status"];
    }) => orderService.updateStatus(orderId, status, { notifyCustomer: false }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.localOrders.byTable(id) },
        { queryKey: queryKeys.localOrders.all },
        { queryKey: queryKeys.localTables.all },
        { queryKey: queryKeys.orders.all },
      ]);
      toast.success("Status atualizado");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Falha ao atualizar status",
      ),
  });

  const regenerateQr = useMutation({
    mutationFn: () => tableService.regenerateQr(id),
    onSuccess: () => {
      toast.success("Novo QR gerado", "Reimprima e cole na mesa.");
      void qc.invalidateQueries({ queryKey: queryKeys.localTables.detail(id) });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao gerar novo QR",
      ),
  });

  const removeTable = useMutation({
    mutationFn: () => tableService.remove(id),
    onSuccess: () => {
      toast.success("Conectaexcluída");
      setConfirmDelete(false);
      void qc.invalidateQueries({ queryKey: queryKeys.localTables.all });
      navigate(ROUTES.localTables, { replace: true });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Falha ao excluir"),
  });

  const selected = useMemo(
    () =>
      selectedOrderId
        ? (orders.find((o) => o.id === selectedOrderId) ?? null)
        : null,
    [orders, selectedOrderId],
  );

  if (tableQ.isLoading || !table) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={ROUTES.localTables}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para mesas
        </Link>
      </div>

      <PageHeader
        title={table.label}
        description={
          table.seats
            ? `${table.seats} lugares${table.notes ? ` · ${table.notes}` : ""}`
            : (table.notes ?? "Conectade salão")
        }
        actions={
          <>
            {billable.length > 0 ? (
              <Button
                leftIcon={<Wallet />}
                onClick={() => setClosingBill(true)}
              >
                Fechar conta · {formatBRL(runningTotal)}
              </Button>
            ) : null}
            <Button
              variant="outline"
              leftIcon={<Trash2 />}
              onClick={() => setConfirmDelete(true)}
            >
              Excluir mesa
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Pedidos abertos
          </h2>
          {ordersQ.isLoading ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<Receipt />}
              title="Conectalivre"
              description="Quando o cliente fizer um pedido pelo QR, aparece aqui."
            />
          ) : (
            <OrderKanban
              orders={orders}
              onOpenDetail={(orderId) => {
                setSelectedOrderId(orderId);
                setDetailOpen(true);
              }}
              notifyCustomer={false}
              serviceType="LOCAL"
            />
          )}
        </section>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-sm font-semibold tracking-tight">QR da mesa</h2>
          <Card className="space-y-3 p-5">
            <QRPreview table={table} />
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer />}
                onClick={() => printQrLabel(table, organization?.name ?? "—")}
              >
                Imprimir QR
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw />}
                loading={regenerateQr.isPending}
                onClick={() => regenerateQr.mutate()}
              >
                Gerar novo código
              </Button>
            </div>
            <p className="text-2xs text-muted-foreground">
              Gerar um novo código invalida o QR anterior. Use quando o QR for
              fotografado ou trocar de mesa.
            </p>
          </Card>
        </aside>
      </div>

      <Modal
        open={detailOpen && !!selected}
        onClose={() => setDetailOpen(false)}
        title={selected ? `Pedido ${orderNumber(selected.sequence)}` : "Pedido"}
        size="xl"
      >
        {selected ? (
          <OrderDetail
            order={selected}
            restaurantName={organization?.name ?? "Restaurante"}
            onAdvance={(status) => {
              advanceStatus.mutate(
                { id: selected.id, status },
                { onSuccess: () => setDetailOpen(false) },
              );
            }}
            pending={advanceStatus.isPending}
          />
        ) : null}
      </Modal>

      <CloseBillModal
        open={closingBill}
        onClose={() => setClosingBill(false)}
        table={table}
        orders={billable}
        runningTotal={runningTotal}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir esta mesa?"
        description={`${table.label} será removida permanentemente. Pedidos com a conta fechada continuam no histórico.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeTable.mutate()}
              loading={removeTable.isPending}
            >
              Sim, excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Não é possível excluir uma mesa com pedidos em aberto. Feche a conta
          antes.
        </p>
      </Modal>

      <Link
        to={ROUTES.localOrders}
        className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        Ver kanban completo do salão
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
      <BillRequestedNotice table={table} />
    </div>
  );
}

function tableQrUrl(table: RestaurantTable): string {
  return `${globalThis.location.origin}/r/mesa/${encodeURIComponent(table.qrToken)}`;
}

function tableQrSvg(url: string, size: number): string {
  return renderToStaticMarkup(
    <QRCodeSVG value={url} size={size} includeMargin />,
  );
}

function QRPreview({ table }: { table: RestaurantTable }) {
  const url = tableQrUrl(table);
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
      <div className="rounded-md bg-white p-3">
        <QRCodeSVG value={url} size={180} includeMargin />
      </div>
      <p className="break-all text-center font-mono text-2xs text-muted-foreground">
        {url}
      </p>
    </div>
  );
}

function BillRequestedNotice({ table }: { table: RestaurantTable }) {
  if (!table.billRequestedAt) return null;
  const at = new Date(table.billRequestedAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      <Bell className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Cliente pediu a conta às <strong>{at}</strong>. Toque em{" "}
        <strong>Fechar conta</strong> quando estiver pronto.
      </p>
    </div>
  );
}

function printQrLabel(table: RestaurantTable, restaurantName: string) {
  const url = tableQrUrl(table);
  const qrSvg = tableQrSvg(url, 280);
  const win = globalThis.open("", "_blank", "width=420,height=600");
  if (!win) {
    toast.error("Não foi possível abrir a impressão");
    return;
  }
  win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(table.label)} · ${escapeHtml(restaurantName)}</title>
  <style>
    body { margin: 0; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; text-align: center; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    p.sub { color: #64748b; font-size: 13px; margin: 0 0 24px; }
    .qr-wrap { display: inline-block; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
    .qr-wrap svg { display: block; width: 280px; height: 280px; }
    p.footer { color: #94a3b8; font-size: 11px; margin-top: 16px; word-break: break-all; }
    @media print {
      body { padding: 12mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(table.label)}</h1>
  <p class="sub">${escapeHtml(restaurantName)} · cardápio do salão</p>
  <div class="qr-wrap">${qrSvg}</div>
  <p class="footer">${escapeHtml(url)}</p>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 150);
    });
  </script>
</body>
</html>`);
  win.document.close();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
