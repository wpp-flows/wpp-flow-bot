import { evolutionApi } from "@/infrastructure/evolution/client";
import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type { BundleProgress } from "@/modules/chat/repositories/chat-repo";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import type {
    CategoryRepository,
    ItemRepository,
    MenuItem,
} from "@/modules/menu/repositories/menu-repo";
import type {
    BundleComponent,
    BundleQuestion,
    Promotion,
    PromotionRepository,
} from "@/modules/promotion/repositories/promotion-repo";
import { evaluateGreetingPromotions } from "@/modules/promotion/usecases/promotion-evaluator";
import { renderMessage, type RenderContext } from "../../render-message";
import { buildCategorySections, buildItemSections } from "../flow-cart";
import type { ListSection } from "../flow-list-types";
import { buildListOptionMap, renderListAsText } from "../flow-option-map";
import {
    BACK_ID,
    BUNDLE_CATEGORY_ID,
    BUNDLE_PREFIX,
    CATEGORY_PREFIX,
    ITEM_PREFIX,
    type SendResult,
} from "../flow-shared";
import type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";

/**
 * Renders MENU steps as a numbered plain-text list. Five modes, switched by
 * `flowState.phase` and the bundle state:
 *  - CATEGORY (no bundleProgress): all org categories, with active greeting
 *    promotions prepended and a synthetic "Promoções" row when active BUNDLE
 *    promos exist.
 *  - PRODUCT + selectedCategoryId="promotions": the list of available bundles.
 *  - PRODUCT + real category id: items inside that category.
 *  - BUNDLE (bundleProgress active, awaitingAnswer=false): pool picker for the
 *    bundle's current component.
 *  - BUNDLE (bundleProgress active, awaitingAnswer=true): question prompt for
 *    the bundle's current question.
 *
 * Customers reply with the row number or its title; the option-map fallback
 * maps that typed text back to the rowId.
 */
export class MenuStepStrategy implements FlowStepStrategy {
    constructor(
        private readonly categoryRepo: CategoryRepository,
        private readonly itemRepo: ItemRepository,
        private readonly promotionRepo: PromotionRepository,
    ) { }

    supports(stepType: FlowStep["type"]): boolean {
        return stepType === "MENU";
    }

    async send(input: FlowStepSenderContext): Promise<SendResult> {
        const { bot, phoneNumber, step, state, ctx } = input;
        const organizationId = bot.organizationId;

        if (state.phase === "BUNDLE" && state.bundleProgress) {
            return this.sendBundleStep({
                bot,
                phoneNumber,
                progress: state.bundleProgress,
                organizationId,
            });
        }
        if (state.phase === "PRODUCT" && state.selectedCategoryId === BUNDLE_CATEGORY_ID) {
            return this.sendBundleList({ bot, phoneNumber, organizationId });
        }
        if (state.phase === "PRODUCT" && state.selectedCategoryId) {
            return this.sendProductList({
                bot,
                phoneNumber,
                selectedCategoryId: state.selectedCategoryId,
                organizationId,
            });
        }
        return this.sendCategoryList({
            bot,
            phoneNumber,
            step,
            ctx,
            organizationId,
        });
    }

    private async sendProductList(input: {
        bot: Bot;
        phoneNumber: string;
        selectedCategoryId: string;
        organizationId: string;
    }): Promise<SendResult> {
        const { bot, phoneNumber, selectedCategoryId, organizationId } = input;
        const allItems = await this.itemRepo.listByCategory(selectedCategoryId);
        const today = new Date().getDay();
        const items = allItems.filter(
            (it) =>
                it.available &&
                (it.availableDaysOfWeek.length === 0 ||
                    it.availableDaysOfWeek.includes(today)),
        );
        const category = await this.categoryRepo.findByIdInOrg(
            organizationId,
            selectedCategoryId,
        );
        const sections = buildItemSections(items);
        const title = category?.name ?? "Itens";
        let description: string;
        if (items.length > 0) {
            description = "Escolha um item para adicionar ao pedido.";
        } else if (allItems.length > 0) {
            description = "Nenhum item desta categoria está disponível hoje.";
        } else {
            description = "Esta categoria ainda não tem itens disponíveis.";
        }

        return this.sendMenuText({
            bot,
            phoneNumber,
            title,
            description,
            sections,
            backRow: { rowId: BACK_ID, title: "⬅️ Voltar para categorias" },
            preview: `${title}: ${items.length} itens`,
        });
    }

    private async sendCategoryList(input: {
        bot: Bot;
        phoneNumber: string;
        step: FlowStep;
        ctx: RenderContext;
        organizationId: string;
    }): Promise<SendResult> {
        const { bot, phoneNumber, step, ctx, organizationId } = input;
        const categories = await this.categoryRepo.listByOrg(organizationId);
        const baseSections = buildCategorySections(categories);
        const bundles = await this.activeBundles(organizationId);
        const sections = bundles.length > 0
            ? [
                {
                    title: "Promoções",
                    rows: [
                        {
                            rowId: `${CATEGORY_PREFIX}${BUNDLE_CATEGORY_ID}`,
                            title: "🎁 Promoções",
                            description: "Combos com preço especial",
                        },
                    ],
                },
                ...baseSections,
            ]
            : baseSections;
        const description = await this.buildGreetingDescription({
            ctx,
            categoriesCount: categories.length,
            organizationId,
        });
        const title = renderMessage(step.content || "Cardápio", ctx);

        return this.sendMenuText({
            bot,
            phoneNumber,
            title,
            description,
            sections,
            backRow: null,
            preview: `${title}: ${categories.length} categorias`,
        });
    }

    private async sendBundleList(input: {
        bot: Bot;
        phoneNumber: string;
        organizationId: string;
    }): Promise<SendResult> {
        const { bot, phoneNumber, organizationId } = input;
        const bundles = await this.activeBundles(organizationId);
        const sections: ListSection[] = bundles.length === 0
            ? []
            : [
                {
                    title: "Combos disponíveis",
                    rows: bundles.map((b) => ({
                        rowId: `${BUNDLE_PREFIX}${b.id}`,
                        title: b.name,
                        description: bundleSummary(b),
                    })),
                },
            ];
        const description = bundles.length === 0
            ? "Nenhum combo ativo no momento."
            : "Escolha um combo para começar a montar.";
        return this.sendMenuText({
            bot,
            phoneNumber,
            title: "🎁 Promoções",
            description,
            sections,
            backRow: { rowId: BACK_ID, title: "⬅️ Voltar para categorias" },
            preview: `Promoções: ${bundles.length} combos`,
        });
    }

    private async sendBundleStep(input: {
        bot: Bot;
        phoneNumber: string;
        progress: BundleProgress;
        organizationId: string;
    }): Promise<SendResult> {
        const { bot, phoneNumber, progress, organizationId } = input;
        const bundle = await this.promotionRepo.findByIdInOrg(
            organizationId,
            progress.bundleId,
        );
        const config = bundle?.bundle;
        if (!bundle || !config) {
            // bundle was deleted mid-flow; bail with a friendly note.
            return this.sendPlain({
                bot,
                phoneNumber,
                text: "Esse combo não está mais disponível. Vamos voltar para o cardápio.",
            });
        }

        if (progress.awaitingAnswer) {
            const question = config.questions[progress.questionIdx];
            if (!question) {
                // defensive — shouldn't happen if the state machine is consistent.
                return this.sendPlain({
                    bot,
                    phoneNumber,
                    text: "Tudo certo! Combo adicionado ao pedido.",
                });
            }
            return this.sendBundleQuestion({ bot, phoneNumber, bundle, question });
        }

        const component = config.components[progress.componentIdx];
        if (!component) {
            // all components done — would normally be question time, but
            // sendBundleStep is also called right after the last pick before
            // the runner advances. Fall back to a plain ack.
            return this.sendPlain({
                bot,
                phoneNumber,
                text: "Tudo certo! Combo pronto.",
            });
        }
        return this.sendBundleComponentPicker({
            bot,
            phoneNumber,
            bundle,
            component,
            progress,
            organizationId,
        });
    }

    private async sendBundleComponentPicker(input: {
        bot: Bot;
        phoneNumber: string;
        bundle: Promotion;
        component: BundleComponent;
        progress: BundleProgress;
        organizationId: string;
    }): Promise<SendResult> {
        const { bot, phoneNumber, bundle, component, progress, organizationId } = input;
        const allItems = await this.itemRepo.listByOrg(organizationId);
        const poolItems = component.itemIds
            .map((id) => allItems.find((it) => it.id === id))
            .filter((it): it is MenuItem => !!it && it.available);

        const picksForThisComponent = progress.picks.filter(
            (p) => p.componentId === component.id,
        ).length;
        const remaining = Math.max(0, component.count - picksForThisComponent);
        const freeTag = component.free ? " (grátis)" : "";

        const title = `${bundle.name} · ${component.label}${freeTag}`;
        const description = remaining > 1
            ? `Escolha ${remaining} de ${component.label.toLowerCase()}.`
            : `Escolha 1 ${component.label.toLowerCase()}.`;

        const sections: ListSection[] = poolItems.length === 0
            ? []
            : [
                {
                    title: component.label,
                    rows: poolItems.map((item) => ({
                        rowId: `${ITEM_PREFIX}${item.id}`,
                        title: item.name,
                        description: `R$ ${item.price}${
                            item.description ? ` — ${item.description}` : ""
                        }`,
                    })),
                },
            ];
        return this.sendMenuText({
            bot,
            phoneNumber,
            title,
            description,
            sections,
            backRow: { rowId: BACK_ID, title: "⬅️ Cancelar combo" },
            preview: `${bundle.name} — pick ${component.label}`,
        });
    }

    private async sendBundleQuestion(input: {
        bot: Bot;
        phoneNumber: string;
        bundle: Promotion;
        question: BundleQuestion;
    }): Promise<SendResult> {
        const { bot, phoneNumber, bundle, question } = input;
        const text = `${bundle.name}\n\n${question.label}`;
        const evolutionResp = await evolutionApi.sendText({
            instanceName: bot.evolutionInstanceName,
            number: phoneNumber,
            text,
        });
        return {
            evolutionResp,
            preview: `Pergunta combo: ${question.label}`,
            optionMap: {},
        };
    }

    /**
     * Combines the static "choose a category" prompt with active greeting
     * promotions (daily messages + teasers), enriching daily ones with the
     * configured featured item's price.
     */
    private async buildGreetingDescription(input: {
        ctx: RenderContext;
        categoriesCount: number;
        organizationId: string;
    }): Promise<string> {
        const { ctx, categoriesCount, organizationId } = input;
        const baseDescription = categoriesCount > 0
            ? "Escolha uma categoria para começar."
            : "Nenhuma categoria disponível no momento.";

        if (!ctx.customer) return baseDescription;

        const promotions = await this.promotionRepo.listActive(organizationId);
        const greetings = evaluateGreetingPromotions({
            promotions,
            customerOrderCount: ctx.customer.orderCount,
        });
        if (greetings.length === 0) return baseDescription;

        const featuredIds = Array.from(
            new Set(
                greetings
                    .map((g) => g.promotion.featuredItemId)
                    .filter((id): id is string => !!id),
            ),
        );
        const featuredItems = await Promise.all(
            featuredIds.map((id) => this.itemRepo.findByIdInOrg(organizationId, id)),
        );
        const featuredById = new Map<string, NonNullable<typeof featuredItems[number]>>();
        for (const item of featuredItems) {
            if (item) featuredById.set(item.id, item);
        }

        const greetingLines = greetings.map((g) => {
            const base = renderMessage(g.message, ctx);
            const itemId = g.promotion.featuredItemId;
            if (!itemId) return base;
            const item = featuredById.get(itemId);
            if (!item) return base;
            const promoPrice =
                g.promotion.promotionalPrice == null
                    ? null
                    : Number.parseFloat(g.promotion.promotionalPrice);
            const regular = Number.parseFloat(String(item.price));
            const priceLine =
                promoPrice != null &&
                    Number.isFinite(promoPrice) &&
                    promoPrice < regular
                    ? `de R$ ${regular.toFixed(2).replace(".", ",")} por *R$ ${promoPrice
                        .toFixed(2)
                        .replace(".", ",")}*`
                    : `*R$ ${regular.toFixed(2).replace(".", ",")}*`;
            return `${base}\n\n✨ Item do dia: ${item.name} — ${priceLine}`;
        });

        return `${greetingLines.join("\n\n")}\n\n${baseDescription}`;
    }

    private async activeBundles(organizationId: string): Promise<Promotion[]> {
        const all = await this.promotionRepo.listActive(organizationId);
        return all.filter(
            (p) => p.kind === "BUNDLE" && (p.bundle?.components.length ?? 0) > 0,
        );
    }

    private async sendPlain(input: {
        bot: Bot;
        phoneNumber: string;
        text: string;
    }): Promise<SendResult> {
        const evolutionResp = await evolutionApi.sendText({
            instanceName: input.bot.evolutionInstanceName,
            number: input.phoneNumber,
            text: input.text,
        });
        return { evolutionResp, preview: input.text, optionMap: {} };
    }

    /**
     * Renders the menu (with optional "voltar" row appended) as plain numbered
     * text and ships it via Evolution's `sendText`. The optionMap returned by
     * {@link buildListOptionMap} is what lets the runner translate the user's
     * typed reply (e.g. "1", "voltar") back to a rowId.
     */
    private async sendMenuText(input: {
        bot: Bot;
        phoneNumber: string;
        title: string;
        description: string;
        sections: ListSection[];
        backRow: { rowId: string; title: string } | null;
        preview: string;
    }): Promise<SendResult> {
        const sections =
            input.backRow && input.sections.length > 0
                ? [
                    ...input.sections,
                    { title: "Navegação", rows: [input.backRow] },
                ]
                : input.sections;
        const optionMap = buildListOptionMap(sections);

        const text = sections.length === 0
            ? `${input.title}\n\n${input.description}`
            : renderListAsText({
                title: input.title,
                description: input.description,
                sections,
            });

        const evolutionResp = await evolutionApi.sendText({
            instanceName: input.bot.evolutionInstanceName,
            number: input.phoneNumber,
            text,
        });
        return { evolutionResp, preview: input.preview, optionMap };
    }
}

function bundleSummary(promo: Promotion): string {
    const bundle = promo.bundle;
    if (!bundle) return "Combo";
    const slots = bundle.components.reduce((sum, c) => sum + c.count, 0);
    return `R$ ${bundle.price} · ${slots} item${slots === 1 ? "" : "s"}`;
}
