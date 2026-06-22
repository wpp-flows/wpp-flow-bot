import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle2,
  ChefHat,
  CircleDashed,
  ClipboardList,
  ImageOff,
  ListChecks,
  ShoppingCart,
  Utensils,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { publicMenuService } from "@/services/publicMenuService";
import { publicTableService } from "@/services/publicTableService";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/stores/uiStore";
import { ApiError } from "@/instances/api";
import type { PublicCartSelectedOption, PublicMenuItem } from "@/types/publicMenu";

function groupSelectionsByGroupId(
  selectedOptions: PublicCartSelectedOption[],
): { groupId: string; optionIds: string[] }[] {
  const byGroup = new Map<string, string[]>();
  for (const o of selectedOptions) {
    const arr = byGroup.get(o.groupId) ?? [];
    arr.push(o.optionId);
    byGroup.set(o.groupId, arr);
  }
  return Array.from(byGroup, ([groupId, optionIds]) => ({ groupId, optionIds }));
}
import type { PublicTableOrder } from "@/types";
import { cn } from "@/lib/utils";
import { CatalogTab } from "./components/CatalogTab";
import { ProductDetailSheet } from "./components/ProductDetailSheet";
import {
  PublicBottomTabs,
  type PublicTab,
} from "./components/PublicBottomTabs";
import { usePublicCart, cartLineTotal } from "./hooks/usePublicCart";
import { formatBrl } from "@/helpers/public-menu-helpers";
import { useClientOrders } from "./hooks/useClientOrders";
import { usePublicTableRealtime } from "./hooks/usePublicTableRealtime";

export function PublicTableMenuPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [activeTab, setActiveTab] = useState<PublicTab>("catalog");
  const [openItem, setOpenItem] = useState<PublicMenuItem | null>(null);

  const { orders, isLoadingOrders, refetchOrders } = useClientOrders(token);
  usePublicTableRealtime(token);

  const nameStorageKey = `mesa.public-customer-name.${token}`;
  const [diner, setDiner] = useState<string>(() => {
    if (typeof globalThis.window === "undefined") return "";
    return globalThis.window.localStorage.getItem(nameStorageKey) ?? "";
  });
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    if (diner.trim()) {
      globalThis.window.localStorage.setItem(nameStorageKey, diner.trim());
    } else {
      globalThis.window.localStorage.removeItem(nameStorageKey);
    }
  }, [diner, nameStorageKey]);

  const tableQ = useQuery({
    queryKey: ["public-table", token],
    queryFn: () => publicTableService.resolve(token),
    enabled: !!token,
  });

  const slug = tableQ.data?.slug ?? "";

  const cartSlug = `mesa-${token}`;
  const cart = usePublicCart(cartSlug);

  const menuQ = useQuery({
    queryKey: [...queryKeys.publicMenu.detail(slug), "LOCAL"] as const,
    queryFn: () => publicMenuService.getMenu(slug, { serviceType: "LOCAL" }),
    enabled: !!slug,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  useEffect(() => {
    const name = tableQ.data?.organizationName ?? "Mesa";
    const label = tableQ.data?.tableLabel ?? "";
    document.title = label ? `${name} | ${label}` : name;
    return () => {
      document.title = "Mesa";
    };
  }, [tableQ.data?.organizationName, tableQ.data?.tableLabel]);

  const addMutation = useMutation({
    mutationFn: async (input: {
      item: PublicMenuItem;
      qty: number;
      notes: string;
      selectedOptions: PublicCartSelectedOption[];
    }) => {
      cart.add({
        itemId: input.item.id,
        name: input.item.name,
        price: input.item.price,
        qty: input.qty,
        notes: input.notes || null,
        selectedOptions: input.selectedOptions,
      });
    },
  });

  const placeOrder = useMutation({
    mutationFn: () =>
      publicMenuService.createOrder(slug, {
        items: cart.items.map((it) => ({
          itemId: it.itemId,
          qty: it.qty,
          notes: it.notes ?? null,
          selections: groupSelectionsByGroupId(it.selectedOptions),
          bundle: it.bundle
            ? {
                bundleId: it.bundle.bundleId,
                picks: it.bundle.picks.map((p) => ({
                  componentId: p.componentId,
                  itemId: p.itemId,
                })),
                answers: it.bundle.answers,
              }
            : null,
        })),
        tableToken: token,
        ...(diner.trim() ? { customerName: diner.trim() } : {}),
      }),
    onSuccess: () => {
      cart.clear();
      toast.success("Pedido enviado", "A cozinha já recebeu. Bom apetite!");
      void refetchOrders();
      setActiveTab("status");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao enviar pedido",
      ),
  });

  const requestBill = useMutation({
    mutationFn: () => publicTableService.requestBill(token),
    onSuccess: () => {
      toast.success("Pedido de conta enviado", "O garçom virá em breve.");
      void tableQ.refetch();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao pedir a conta",
      ),
  });

  if (tableQ.isLoading || (slug && menuQ.isLoading)) {
    return <CenteredSpinner />;
  }
  if (tableQ.isError || !tableQ.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Mesa não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Peça ao restaurante para gerar um novo QR.
          </p>
        </div>
      </div>
    );
  }
  if (menuQ.isError || !menuQ.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Cardápio indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente novamente em alguns instantes.
          </p>
        </div>
      </div>
    );
  }

  const menu = menuQ.data;
  const tableInfo = tableQ.data;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {menu.organization.name}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              <span className="inline-flex items-center gap-1">
                <Utensils className="h-3.5 w-3.5" />
                {tableInfo.tableLabel}
              </span>
            </p>
          </div>
          <span className="rounded-full bg-teal-500/15 px-2.5 py-1 text-2xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-300">
            Salão
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {activeTab === "catalog" ? (
          <CatalogTab menu={menu} onItemSelect={setOpenItem} />
        ) : activeTab === "status" ? (
          <TableOrdersStatusTab
            orders={orders ?? []}
            isLoading={isLoadingOrders}
          />
        ) : (
          <TableCartTab
            items={cart.items}
            token={token}
            menuItems={menu.items}
            dinerName={diner}
            onDinerNameChange={setDiner}
            onRemove={cart.remove}
            onUpdateQty={cart.updateQty}
            onBrowseMenu={() => setActiveTab("catalog")}
            onSend={() => placeOrder.mutate()}
            onRequestBill={() => requestBill.mutate()}
            sending={placeOrder.isPending}
            billRequested={tableInfo.billRequested}
            requestingBill={requestBill.isPending}
            subtotal={cart.subtotal}
          />
        )}
      </main>

      {activeTab === "catalog" && cart.totalItems > 0 ? (
        <FloatingCartPill
          totalItems={cart.totalItems}
          subtotal={cart.subtotal}
          onOpen={() => setActiveTab("orders")}
        />
      ) : null}

      <PublicBottomTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: "catalog", label: "Cardápio", icon: <UtensilsCrossed /> },
          {
            id: "orders",
            label: "Pedido",
            icon: <ClipboardList />,
            badge: cart.totalItems > 0 ? cart.totalItems : null,
          },
          {
            id: "status",
            label: "Status",
            icon: <ListChecks />,
            badge:
              orders.filter(
                (o) => o.status !== "DELIVERED" && o.status !== "CANCELED",
              ).length ?? null,
          },
        ]}
      />

      <ProductDetailSheet
        item={openItem}
        open={openItem !== null}
        onOpenChange={(open) => {
          if (!open) setOpenItem(null);
        }}
        disabled={!menu.isOpen}
        onConfirm={(input) => {
          if (!openItem) return;
          addMutation.mutate({
            item: openItem,
            qty: input.qty,
            notes: input.notes,
            selectedOptions: input.selectedOptions,
          });
        }}
      />
    </div>
  );
}

function TableCartTab({
  token,
  items,
  menuItems,
  dinerName,
  onDinerNameChange,
  onRemove,
  onUpdateQty,
  onBrowseMenu,
  onSend,
  onRequestBill,
  sending,
  billRequested,
  requestingBill,
  subtotal,
}: {
  token: string;
  items: ReturnType<typeof usePublicCart>["items"];
  /** Used to look up the imageUrl for each cart line — cart entries
   *  don't carry the image themselves so we resolve from the menu. */
  menuItems: PublicMenuItem[];
  /** Diner's typed name (persisted per token by the parent). Empty
   *  string = the diner hasn't typed one yet; we still let the order
   *  go through anonymously in that case. */
  dinerName: string;
  onDinerNameChange: (next: string) => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onBrowseMenu: () => void;
  onSend: () => void;
  onRequestBill: () => void;
  sending: boolean;
  billRequested: boolean;
  requestingBill: boolean;
  subtotal: number;
}) {
  const imageByItemId = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const it of menuItems) m.set(it.id, it.imageUrl ?? null);
    return m;
  }, [menuItems]);
  const totalItems = useMemo(
    () => items.reduce((sum, it) => sum + it.qty, 0),
    [items],
  );
  const { orders } = useClientOrders(token);

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          <h2 className="font-medium">Seu pedido está vazio</h2>
          <p className="text-sm text-muted-foreground">
            Volte ao cardápio para adicionar itens.
          </p>
          <Button onClick={onBrowseMenu}>Ver cardápio</Button>
        </div>
        <Button
          variant="outline"
          className="w-full"
          leftIcon={<Bell />}
          loading={requestingBill}
          disabled={billRequested || orders.length === 0}
          onClick={onRequestBill}
        >
          {billRequested ? "Conta solicitada" : "Pedir a conta"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Itens
        </h2>
        <ul className="space-y-3">
          {items.map((it) => {
            const imageUrl = imageByItemId.get(it.itemId) ?? null;
            return (
              <li
                key={it.id}
                className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-soft-sm"
              >
                <CartItemThumb url={imageUrl} alt={it.name} />

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <p className="line-clamp-2 text-sm font-medium leading-tight">
                      {it.name}
                    </p>
                    {it.selectedOptions.length > 0 ? (
                      <p className="mt-1 line-clamp-2 text-2xs text-muted-foreground">
                        {it.selectedOptions.map((o) => o.name).join(" · ")}
                      </p>
                    ) : null}
                    {it.notes ? (
                      <p className="mt-1 line-clamp-2 text-2xs italic text-muted-foreground">
                        {it.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(it.id, it.qty - 1)}
                        className="inline-flex h-7 w-7 items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                        aria-label="Diminuir"
                      >
                        –
                      </button>
                      <span className="min-w-6 text-center text-xs font-medium tabular-nums">
                        {it.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(it.id, it.qty + 1)}
                        className="inline-flex h-7 w-7 items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatBrl(cartLineTotal(it))}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(it.id)}
                    className="mt-1 self-start text-2xs text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-soft-sm">
        <label
          htmlFor="diner-name"
          className="block text-sm font-medium text-foreground"
        >
          Seu nome (opcional)
        </label>
        <input
          id="diner-name"
          type="text"
          autoComplete="given-name"
          placeholder="Ex.: João"
          value={dinerName}
          maxLength={60}
          onChange={(e) => onDinerNameChange(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="mt-1 text-2xs text-muted-foreground">
          Ajuda o garçom a identificar seu pedido ao chegar à mesa.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-soft-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">
            Subtotal · {totalItems} {totalItems === 1 ? "item" : "itens"}
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {formatBrl(subtotal)}
          </span>
        </div>
        <p className="mt-1 text-2xs text-muted-foreground">
          O pagamento é feito no caixa no fim da refeição.
        </p>
      </section>

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          leftIcon={<CheckCircle2 />}
          loading={sending}
          onClick={onSend}
        >
          Enviar pedido para a cozinha
        </Button>
        <Button
          variant="outline"
          className="w-full"
          leftIcon={<Bell />}
          loading={requestingBill}
          disabled={billRequested || orders.length === 0}
          onClick={onRequestBill}
        >
          {billRequested ? "Conta solicitada" : "Pedir a conta"}
        </Button>
      </div>
    </div>
  );
}

function TableOrdersStatusTab({
  orders,
  isLoading,
}: {
  orders: PublicTableOrder[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <ListChecks className="h-8 w-8 text-muted-foreground" />
        <h2 className="font-medium">Nada por enquanto</h2>
        <p className="text-sm text-muted-foreground">
          Os pedidos que você enviar aparecem aqui com o status em tempo real.
        </p>
      </div>
    );
  }

  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ul className="space-y-3">
      {sorted.map((order) => (
        <StatusCard key={order.id} order={order} />
      ))}
    </ul>
  );
}

const STATUS_META: Record<
  PublicTableOrder["status"],
  { label: string; tone: string; icon: ReactNode }
> = {
  RECEIVED: {
    label: "Recebido",
    tone: "bg-info-soft text-info ring-info/30",
    icon: <CircleDashed className="h-3.5 w-3.5" />,
  },
  PREPARING: {
    label: "Preparando",
    tone: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30",
    icon: <ChefHat className="h-3.5 w-3.5" />,
  },
  OUT_FOR_DELIVERY: {
    label: "Pronto para servir",
    tone: "bg-primary/15 text-primary ring-primary/30",
    icon: <ChefHat className="h-3.5 w-3.5" />,
  },
  DELIVERED: {
    label: "Servido",
    tone: "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  CANCELED: {
    label: "Cancelado",
    tone: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-700/40 dark:text-zinc-300 dark:ring-zinc-600/30",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

function StatusCard({ order }: { order: PublicTableOrder }) {
  const meta = STATUS_META[order.status];
  const isCanceled = order.status === "CANCELED";
  const placedAt = new Date(order.createdAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const orderNumber = `#${String(order.sequence).padStart(4, "0")}`;
  const dinerName =
    order.customerName && !order.customerName.toLowerCase().startsWith("mesa ")
      ? order.customerName
      : null;

  return (
    <li
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-soft-sm",
        isCanceled && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold tracking-tight">
            {orderNumber}
          </p>
          {dinerName ? (
            <p className="mt-0.5 text-xs font-medium text-foreground">
              {dinerName}
            </p>
          ) : null}
          <p className="mt-0.5 text-2xs text-muted-foreground">
            Enviado às {placedAt}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
            meta.tone,
          )}
        >
          {meta.icon}
          {meta.label}
        </span>
      </div>

      <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        {order.items.map((it, idx) => (
          <li key={`${order.id}-${idx}`} className="flex items-baseline gap-2">
            <span className="text-foreground/80">{it.qty}×</span>
            <span className="line-clamp-1">{it.name}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="font-mono font-semibold tabular-nums">
          {formatBrl(order.total)}
        </span>
      </div>
    </li>
  );
}

function CartItemThumb({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="h-16 w-16 shrink-0 rounded-md object-cover"
    />
  );
}

function FloatingCartPill({
  totalItems,
  subtotal,
  onOpen,
}: {
  totalItems: number;
  subtotal: number;
  onOpen: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(theme(spacing.16)+env(safe-area-inset-bottom))] z-20 px-4">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center justify-between rounded-xl bg-primary px-5 py-3 text-primary-foreground shadow-soft-lg transition-colors hover:bg-primary/90"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ShoppingCart className="h-4 w-4" />
            {totalItems} {totalItems === 1 ? "item" : "itens"}
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatBrl(subtotal)}
          </span>
        </button>
      </div>
    </div>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
