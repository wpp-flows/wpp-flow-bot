import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Clock,
  Receipt,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { publicMenuService } from "@/services/publicMenuService";
import { queryKeys } from "@/lib/queryClient";
import type { PublicMenuItem } from "@/types/publicMenu";
import { CartTab } from "./components/CartTab";
import { CatalogTab } from "./components/CatalogTab";
import { CheckoutTab } from "./components/CheckoutTab";
import { ProductDetailSheet } from "./components/ProductDetailSheet";
import {
  PublicBottomTabs,
  type PublicTab,
} from "./components/PublicBottomTabs";
import { usePublicCart } from "./hooks/usePublicCart";
import { formatBrl } from "@/helpers/public-menu-helpers";

const TAB_LABELS: Record<PublicTab, string> = {
  catalog: "Cardápio",
  orders: "Pedidos",
  checkout: "Pagamento",
};

export function PublicMenuPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<PublicTab>(
    (searchParams.get("tab") as PublicTab) ?? "catalog",
  );
  const [openItem, setOpenItem] = useState<PublicMenuItem | null>(null);

  const changeTab = useCallback((tab: PublicTab) => {
    setActiveTab(tab);
    if (tab === "checkout") {
      requestAnimationFrame(() => globalThis.scrollTo(0, 0));
    }
  }, []);

  const cart = usePublicCart(slug);

  const menuQ = useQuery({
    queryKey: queryKeys.publicMenu.detail(slug),
    queryFn: () => publicMenuService.getMenu(slug),
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
    enabled: !!slug,
  });

  useEffect(() => {
    const restaurantName = menuQ.data?.organization.name ?? "Mesa";
    document.title = `${restaurantName} | ${TAB_LABELS[activeTab]}`;
    return () => {
      document.title = "Mesa";
    };
  }, [activeTab, menuQ.data?.organization.name]);

  const addMutation = useMutation({
    mutationFn: async (input: {
      item: PublicMenuItem;
      qty: number;
      notes: string;
      additionals: { id: string; name: string; price: string }[];
    }) => {
      cart.add({
        itemId: input.item.id,
        name: input.item.name,
        price: input.item.price,
        qty: input.qty,
        notes: input.notes || null,
        additionals: input.additionals,
      });
    },
  });

  if (menuQ.isLoading) {
    return <CenteredSpinner />;
  }

  if (menuQ.isError || !menuQ.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Restaurante não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Confira o link e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  const menu = menuQ.data;
  const queryString = searchParams.toString();
  const orgDeliveryFee =
    Number.parseFloat(menu.organization.deliveryFee || "0") || 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header menu={menu} />

      <main className="mx-auto max-w-3xl px-4 py-6">
        {!menu.isOpen ? <ClosedBanner message={menu.closedMessage} /> : null}

        {activeTab === "catalog" ? (
          <CatalogTab menu={menu} onItemSelect={setOpenItem} />
        ) : null}

        {activeTab === "orders" ? (
          <CartTab
            slug={slug}
            items={menu.items}
            onBrowseMenu={() => changeTab("catalog")}
            onCheckout={() => changeTab("checkout")}
          />
        ) : null}

        {activeTab === "checkout" ? (
          <CheckoutTab
            slug={slug}
            queryString={queryString}
            deliveryFee={orgDeliveryFee}
            isOpen={menu.isOpen}
            onBrowseMenu={() => changeTab("catalog")}
          />
        ) : null}
      </main>

      {activeTab === "catalog" && cart.totalItems > 0 ? (
        <FloatingCartPill
          totalItems={cart.totalItems}
          subtotal={cart.subtotal}
          onOpen={() => changeTab("checkout")}
        />
      ) : null}

      <PublicBottomTabs
        active={activeTab}
        onChange={changeTab}
        tabs={[
          { id: "catalog", label: "Cardápio", icon: <UtensilsCrossed /> },
          { id: "orders", label: "Pedidos", icon: <ClipboardList /> },
          {
            id: "checkout",
            label: "Pagamento",
            icon: <Receipt />,
            badge: cart.totalItems > 0 ? cart.totalItems : null,
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
            additionals: input.additionals,
          });
        }}
      />
    </div>
  );
}

function Header({
  menu,
}: {
  menu: { organization: { name: string }; isOpen: boolean };
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {menu.organization.name}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Cardápio digital
          </p>
        </div>
        <span
          className={
            menu.isOpen
              ? "inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-2xs font-medium text-success"
              : "inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-2xs font-medium text-warning"
          }
        >
          <Clock className="h-3 w-3" />
          {menu.isOpen ? "Aberto agora" : "Fechado"}
        </span>
      </div>
    </header>
  );
}

function ClosedBanner({ message }: { message: string | null }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="text-sm text-amber-900 dark:text-amber-100">
        <p className="font-medium">Estamos fechados agora.</p>
        {message ? (
          <p className="mt-1 whitespace-pre-line opacity-90">{message}</p>
        ) : null}
      </div>
    </div>
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
    <div className="fixed inset-x-0 bottom-[calc(theme(spacing.16)+env(safe-area-inset-bottom))] z-30 px-4">
      <div className="mx-auto max-w-3xl">
        <Button
          type="button"
          size="lg"
          className="flex w-full items-center justify-between rounded-full shadow-soft-lg"
          onClick={onOpen}
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {totalItems} {totalItems === 1 ? "item" : "itens"}
          </span>
          <span className="font-semibold">{formatBrl(subtotal)}</span>
        </Button>
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
