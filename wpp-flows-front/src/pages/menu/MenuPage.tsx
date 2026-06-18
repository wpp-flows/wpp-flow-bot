import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { menuService } from '@/services/menuService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import type { MenuCategory, MenuItem, ServiceType } from '@/types';
import { CategoryFormModal } from './components/CategoryFormModal';
import { ItemFormModal } from './components/ItemFormModal';
import { CategoryRow } from './components/CategoryRow';

interface Props {
  serviceType: ServiceType;
}

const SIDE_COPY: Record<ServiceType, { title: string; description: string; empty: string }> = {
  DELIVERY: {
    title: 'Menu · Delivery',
    description:
      'Organize os pratos que o bot vai oferecer aos clientes no delivery. Arraste para reordenar como as categorias aparecem no fluxo.',
    empty:
      'Agrupe seus pratos do delivery em categorias — Pizzas, Bebidas, Sobremesas. Os clientes veem nessa ordem.',
  },
  LOCAL: {
    title: 'Menu · Salão',
    description:
      'Organize o cardápio do salão. Os clientes veem este menu ao escanear o QR da mesa.',
    empty:
      'Agrupe os pratos do salão em categorias. Esse menu é totalmente independente do delivery.',
  },
};

export function MenuPage({ serviceType }: Readonly<Props>) {
  const qc = useQueryClient();
  const copy = SIDE_COPY[serviceType];

  const categoriesQ = useQuery({
    queryKey: queryKeys.menu.categories(serviceType),
    queryFn: () => menuService.listCategories({ serviceType }),
  });
  const itemsQ = useQuery({
    queryKey: queryKeys.menu.items(serviceType),
    queryFn: () => menuService.listItems({ serviceType }),
  });

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<MenuCategory | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>(undefined);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    (itemsQ.data ?? []).forEach((item) => {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    });
    return map;
  }, [itemsQ.data]);

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      menuService.reorderCategories(serviceType, orderedIds),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.menu.categories(serviceType) },
      ]);
      toast.success('Ordem salva');
    },
  });

  const handleDrop = (targetId: string) => {
    if (!draggingId || !categoriesQ.data || draggingId === targetId) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    const ids = categoriesQ.data.map((c) => c.id);
    const fromIdx = ids.indexOf(draggingId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggingId);
    reorder.mutate(ids);
    setDraggingId(null);
    setOverId(null);
  };

  const isLoading = categoriesQ.isLoading || itemsQ.isLoading;
  const isEmpty = (categoriesQ.data?.length ?? 0) === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Plus />}
              onClick={() => {
                setEditCategory(null);
                setCatModalOpen(true);
              }}
            >
              Nova categoria
            </Button>
            <Button
              leftIcon={<Plus />}
              disabled={isEmpty}
              onClick={() => {
                setEditItem(null);
                setDefaultCategoryId(categoriesQ.data?.[0]?.id);
                setItemModalOpen(true);
              }}
            >
              Novo item
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<UtensilsCrossed />}
          title="Nenhuma categoria ainda"
          description={copy.empty}
          action={
            <Button
              leftIcon={<Plus />}
              onClick={() => {
                setEditCategory(null);
                setCatModalOpen(true);
              }}
            >
              Criar primeira categoria
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {categoriesQ.data?.map((category) => (
            <div
              key={category.id}
              draggable
              onDragStart={() => setDraggingId(category.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggingId && draggingId !== category.id) setOverId(category.id);
              }}
              onDragLeave={() => setOverId((prev) => (prev === category.id ? null : prev))}
              onDrop={() => handleDrop(category.id)}
            >
              <CategoryRow
                category={category}
                items={itemsByCategory.get(category.id) ?? []}
                isDragging={draggingId === category.id}
                isOver={overId === category.id}
                onEditCategory={() => {
                  setEditCategory(category);
                  setCatModalOpen(true);
                }}
                onAddItem={() => {
                  setEditItem(null);
                  setDefaultCategoryId(category.id);
                  setItemModalOpen(true);
                }}
                onEditItem={(item) => {
                  setEditItem(item);
                  setDefaultCategoryId(item.categoryId);
                  setItemModalOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      )}

      <CategoryFormModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        category={editCategory}
        serviceType={serviceType}
      />
      <ItemFormModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        categories={categoriesQ.data ?? []}
        defaultCategoryId={defaultCategoryId}
        item={editItem}
        serviceType={serviceType}
      />
    </div>
  );
}
