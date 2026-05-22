import { IconButton, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { BundleFormComponent } from "../promotions-constants";
import { MenuItem } from "@/types";

export function ComponentEditor({
    component,
    menuItems,
    onChange,
    onRemove,
}: Readonly<{
    component: BundleFormComponent;
    menuItems: MenuItem[];
    onChange: (patch: Partial<BundleFormComponent>) => void;
    onRemove: () => void;
}>) {
    const toggleItem = (itemId: string) => {
        const next = component.itemIds.includes(itemId)
            ? component.itemIds.filter((id) => id !== itemId)
            : [...component.itemIds, itemId];
        onChange({ itemIds: next });
    };

    return (
        <div className="rounded-md border border-border bg-card p-3 space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_auto_auto]">
                <Input
                    placeholder="Rótulo (ex: Pizza grande)"
                    value={component.label}
                    onChange={(e) => onChange({ label: e.target.value })}
                />
                <Input
                    type="number"
                    min="1"
                    value={String(component.count)}
                    onChange={(e) =>
                        onChange({ count: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })
                    }
                    placeholder="qtd"
                />
                <label className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={component.free}
                        onChange={(e) => onChange({ free: e.target.checked })}
                    />
                    <span>Grátis</span>
                </label>
                <IconButton variant="ghost" onClick={onRemove} aria-label="Remover componente">
                    <Trash2 className="text-destructive" />
                </IconButton>
            </div>

            <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Opções que o cliente pode escolher
                </p>
                {menuItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Crie itens no menu para poder adicionar ao combo.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {menuItems.map((item) => {
                            const active = component.itemIds.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleItem(item.id)}
                                    className={cn(
                                        'rounded-full border px-2.5 py-0.5 text-2xs font-medium transition',
                                        active
                                            ? 'border-primary bg-primary-soft text-primary'
                                            : 'border-border bg-card text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {item.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
