import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Plus, Receipt, Table as TableIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { ROUTES } from "@/constants/app";
import { queryKeys } from "@/lib/queryClient";
import { tableService } from "@/services/tableService";
import { orderService } from "@/services/orderService";
import { toast } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { ApiError } from "@/instances/api";
import type { Order, RestaurantTable } from "@/types";
import { formatBRL } from "@/helpers/order-helpers";

const newTableSchema = z.object({
  label: z.string().trim().min(1, "Informe o nome da mesa.").max(60),
  seats: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v || (!Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 99),
      "Entre 1 e 99.",
    ),
  notes: z.string().max(280).optional(),
});
type NewTableForm = z.infer<typeof newTableSchema>;

export function LocalTablesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const tablesQ = useQuery({
    queryKey: queryKeys.localTables.all,
    queryFn: tableService.list,
    gcTime: 60 * 1000 * 0.5,
  });

  const ordersQ = useQuery({
    queryKey: queryKeys.localOrders.all,
    queryFn: () =>
      orderService.list({ serviceType: "LOCAL", unbilledOnly: true }),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const tables = tablesQ.data ?? [];
  const orders = ordersQ.data ?? [];

  const totalsByTable = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      if (!o.tableId || o.status === "CANCELED") continue;
      const cur = m.get(o.tableId) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number.parseFloat(o.total || "0");
      m.set(o.tableId, cur);
    }
    return m;
  }, [orders]);

  const form = useForm<NewTableForm>({
    resolver: zodResolver(newTableSchema),
    defaultValues: { label: "", seats: "", notes: "" },
  });
  const createTable = useMutation({
    mutationFn: (values: NewTableForm) =>
      tableService.create({
        label: values.label,
        seats: values.seats ? Number(values.seats) : null,
        notes: values.notes?.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Mesa criada");
      setCreating(false);
      form.reset({ label: "", seats: "", notes: "" });
      void qc.invalidateQueries({ queryKey: queryKeys.localTables.all });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao criar mesa",
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mesas"
        description="Cada mesa tem um QR próprio. O cliente escaneia, faz o pedido sem precisar pagar — o caixa fecha a conta depois."
        info={
          <div className="space-y-2">
            <p className="font-medium tracking-tight text-foreground">
              Como funciona o salão.
            </p>
            <p className="text-muted-foreground">
              Cadastre uma mesa, imprima o QR e cole na mesa. O cliente
              escaneia, escolhe os itens e o pedido cai direto no kanban de
              Salão → Pedidos. Quando o cliente acabar, clique em{" "}
              <strong>Fechar conta</strong> na mesa para gerar o recibo e
              creditar a carteira do salão.
            </p>
          </div>
        }
        actions={
          <Button leftIcon={<Plus />} onClick={() => setCreating(true)}>
            Nova mesa
          </Button>
        }
      />

      {tablesQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          icon={<TableIcon />}
          title="Nenhuma mesa cadastrada"
          description="Crie sua primeira mesa para começar a receber pedidos do salão."
          action={
            <Button leftIcon={<Plus />} onClick={() => setCreating(true)}>
              Criar mesa
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              totals={totalsByTable.get(table.id) ?? null}
              ordersForTable={orders.filter((o) => o.tableId === table.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nova mesa"
        description="Cadastre uma mesa para gerar o QR de pedido."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={form.handleSubmit((v) => createTable.mutate(v))}
              loading={createTable.isPending}
            >
              Criar mesa
            </Button>
          </>
        }
      >
        <form className="space-y-4" noValidate>
          <FormField
            label="Nome"
            htmlFor="new-table-label"
            error={form.formState.errors.label?.message}
            required
            hint="Ex.: Mesa1, Varanda 3, Balcão."
          >
            <Input
              id="new-table-label"
              autoFocus
              placeholder="Mesa1"
              invalid={!!form.formState.errors.label}
              {...form.register("label")}
            />
          </FormField>
          <FormField
            label="Lugares (opcional)"
            htmlFor="new-table-seats"
            error={form.formState.errors.seats?.message}
          >
            <Input
              id="new-table-seats"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              placeholder="4"
              invalid={!!form.formState.errors.seats}
              {...form.register("seats")}
            />
          </FormField>
          <FormField label="Observações (opcional)" htmlFor="new-table-notes">
            <Textarea
              id="new-table-notes"
              rows={2}
              placeholder="Aniversário do João, mesa do canto…"
              {...form.register("notes")}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

interface TableCardProps {
  table: RestaurantTable;
  totals: { count: number; revenue: number } | null;
  ordersForTable: Order[];
}

function TableCard({
  table,
  totals,
  ordersForTable,
}: Readonly<TableCardProps>) {
  const oldest = useMemo(() => {
    if (ordersForTable.length === 0) return null;
    const t = ordersForTable.reduce((min, o) => {
      const created = new Date(o.createdAt).getTime();
      return created < min ? created : min;
    }, Date.now());
    return t;
  }, [ordersForTable]);

  const minutesElapsed = oldest
    ? Math.floor((Date.now() - oldest) / 60_000)
    : 0;
  const dotTone =
    table.status === "EMPTY"
      ? "bg-zinc-300 dark:bg-zinc-600"
      : minutesElapsed < 30
        ? "bg-emerald-500"
        : minutesElapsed < 60
          ? "bg-amber-500"
          : "bg-rose-500";

  const occupiedFor = oldest
    ? minutesElapsed < 60
      ? `${minutesElapsed} min`
      : `${Math.floor(minutesElapsed / 60)}h ${minutesElapsed % 60}min`
    : null;

  const billRequested =
    table.status === "BILL_REQUESTED" || !!table.billRequestedAt;

  return (
    <Link to={ROUTES.localTableDetail(table.id)} className="block">
      <Card
        className={cn(
          "flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-soft-md",
          billRequested && "ring-2 ring-amber-400 animate-pulse-soft",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn("h-2.5 w-2.5 rounded-full", dotTone)}
              aria-hidden
            />
            <h3 className="text-base font-semibold tracking-tight">
              {table.label}
            </h3>
          </div>
          {billRequested ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              <Bell className="h-3 w-3" />
              Pedir conta
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          {table.seats ? <p>{table.seats} lugares</p> : null}
          {table.notes ? (
            <p className="line-clamp-2 italic" title={table.notes}>
              {table.notes}
            </p>
          ) : null}
        </div>

        <div className="border-t border-border pt-3">
          {totals ? (
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Receipt className="h-3 w-3" />
                {totals.count} pedido{totals.count === 1 ? "" : "s"}
                {occupiedFor ? <span>· há {occupiedFor}</span> : null}
              </div>
              <span className="font-mono text-sm font-semibold">
                {formatBRL(totals.revenue)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Mesa livre</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
