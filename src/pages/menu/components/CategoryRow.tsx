import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { menuService } from '@/services/menuService';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { formatCurrency, cn } from '@/lib/utils';
import type { MenuCategory, MenuItem } from '@/types';

interface Props {
  category: MenuCategory;
  items: MenuItem[];
  onEditCategory: () => void;
  onAddItem: () => void;
  onEditItem: (item: MenuItem) => void;
  isDragging?: boolean;
  isOver?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function CategoryRow({
  category,
  items,
  onEditCategory,
  onAddItem,
  onEditItem,
  isDragging,
  isOver,
  dragHandleProps,
}: Props) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const removeCategory = useMutation({
    mutationFn: () => menuService.removeCategory(category.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.menu.categories });
      qc.invalidateQueries({ queryKey: queryKeys.menu.items });
      toast.success('Category deleted');
      setConfirmDelete(false);
    },
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => menuService.removeItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.menu.items });
      toast.success('Item deleted');
    },
  });

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card transition-all',
        isDragging && 'opacity-50',
        isOver && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background',
      )}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button
          {...dragHandleProps}
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight truncate">{category.name}</h3>
            <Badge tone="neutral" size="sm">
              {items.length} item{items.length === 1 ? '' : 's'}
            </Badge>
          </div>
          {category.description ? (
            <p className="text-xs text-muted-foreground truncate">{category.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" leftIcon={<Plus />} onClick={onAddItem}>
            Add item
          </Button>
          <IconButton size="sm" variant="ghost" onClick={onEditCategory} aria-label="Edit category">
            <Edit3 />
          </IconButton>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete category"
          >
            <Trash2 className="text-destructive" />
          </IconButton>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6 text-center text-xs text-muted-foreground">
          No items yet — add the first one to make it visible to customers.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    {item.name.slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  {!item.available ? (
                    <Badge size="sm" tone="warning">
                      Hidden
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                {formatCurrency(item.price)}
              </span>
              <div className="flex items-center">
                <IconButton size="sm" variant="ghost" onClick={() => onEditItem(item)} aria-label="Edit item">
                  <Edit3 />
                </IconButton>
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={() => removeItem.mutate(item.id)}
                  aria-label="Delete item"
                >
                  <Trash2 className="text-destructive" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${category.name}?`}
        description="All items inside this category will also be deleted."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeCategory.mutate()}
              loading={removeCategory.isPending}
            >
              Delete category
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {items.length > 0
            ? `${items.length} item${items.length === 1 ? '' : 's'} will be permanently removed.`
            : 'This category has no items, but will still be removed.'}
        </p>
      </Modal>
    </div>
  );
}
