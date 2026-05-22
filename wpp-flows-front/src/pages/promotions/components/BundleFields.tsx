import { MenuItem } from "@/types";
import { BundleFormComponent, PromotionFormState } from "../promotions-constants";
import { generateId } from "@/lib/utils";
import { Button, FormField, IconButton, Input } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import { ComponentEditor } from "./ComponentEditor";

interface Props {
    form: PromotionFormState;
    setForm: React.Dispatch<React.SetStateAction<PromotionFormState>>;
    menuItems: MenuItem[];
}

function keyFromLabel(label: string, fallback: number): string {
    const slug = label
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return slug || `pergunta_${fallback}`;
}

export function BundleFields({
    form,
    setForm,
    menuItems,
}: Readonly<Props>) {
    const updateComponent = (id: string, patch: Partial<BundleFormComponent>) =>
        setForm((prev) => ({
            ...prev,
            bundleComponents: prev.bundleComponents.map((c) =>
                c.id === id ? { ...c, ...patch } : c,
            ),
        }));

    const addComponent = () =>
        setForm((prev) => ({
            ...prev,
            bundleComponents: [
                ...prev.bundleComponents,
                {
                    id: generateId('comp'),
                    label: `Item ${prev.bundleComponents.length + 1}`,
                    itemIds: [],
                    count: 1,
                    free: false,
                },
            ],
        }));

    const removeComponent = (id: string) =>
        setForm((prev) => ({
            ...prev,
            bundleComponents: prev.bundleComponents.filter((c) => c.id !== id),
        }));

    const updateQuestionLabel = (id: string, label: string) =>
        setForm((prev) => ({
            ...prev,
            bundleQuestions: prev.bundleQuestions.map((q, i) =>
                q.id === id ? { ...q, label, fieldKey: keyFromLabel(label, i + 1) } : q,
            ),
        }));

    const addQuestion = () =>
        setForm((prev) => ({
            ...prev,
            bundleQuestions: [
                ...prev.bundleQuestions,
                {
                    id: generateId('q'),
                    label: '',
                    fieldKey: `pergunta_${prev.bundleQuestions.length + 1}`,
                },
            ],
        }));

    const removeQuestion = (id: string) =>
        setForm((prev) => ({
            ...prev,
            bundleQuestions: prev.bundleQuestions.filter((q) => q.id !== id),
        }));

    return (
        <>
            <FormField
                label="Preço do combo (R$)"
                htmlFor="promo-bundle-price"
                required
                hint="Valor final cobrado pelo combo, independente da soma dos itens."
                className="sm:col-span-2"
            >
                <Input
                    id="promo-bundle-price"
                    inputMode="decimal"
                    value={form.bundlePrice}
                    onChange={(e) => setForm({ ...form, bundlePrice: e.target.value })}
                    placeholder="59,90"
                />
            </FormField>

            <div className="sm:col-span-2 space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold tracking-tight">Itens do combo</p>
                        <p className="text-2xs text-muted-foreground">
                            Para cada item, escolha do menu quais opções o cliente pode pedir.
                        </p>
                    </div>
                    <Button size="sm" variant="ghost" leftIcon={<Plus />} onClick={addComponent}>
                        Adicionar
                    </Button>
                </div>

                {form.bundleComponents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Nenhum item ainda. Adicione pelo menos um (ex: "Pizza grande").
                    </p>
                ) : (
                    <div className="space-y-3">
                        {form.bundleComponents.map((component) => (
                            <ComponentEditor
                                key={component.id}
                                component={component}
                                menuItems={menuItems}
                                onChange={(patch) => updateComponent(component.id, patch)}
                                onRemove={() => removeComponent(component.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="sm:col-span-2 space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold tracking-tight">Perguntas extras</p>
                        <p className="text-2xs text-muted-foreground">
                            Perguntas que o bot faz ao montar este combo (ex: "Qual refrigerante?").
                        </p>
                    </div>
                    <Button size="sm" variant="ghost" leftIcon={<Plus />} onClick={addQuestion}>
                        Adicionar
                    </Button>
                </div>

                {form.bundleQuestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Sem perguntas extras. Adicione se o combo precisa de uma escolha além dos itens acima.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {form.bundleQuestions.map((q) => (
                            <div key={q.id} className="flex items-center gap-2">
                                <Input
                                    placeholder="Ex: Qual refrigerante?"
                                    value={q.label}
                                    onChange={(e) => updateQuestionLabel(q.id, e.target.value)}
                                />
                                <IconButton
                                    variant="ghost"
                                    onClick={() => removeQuestion(q.id)}
                                    aria-label="Remover pergunta"
                                >
                                    <Trash2 className="text-destructive" />
                                </IconButton>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
