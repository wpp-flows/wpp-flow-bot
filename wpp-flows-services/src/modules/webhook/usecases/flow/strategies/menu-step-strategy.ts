import { evolutionApi } from "@/infrastructure/evolution/client";
import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import type {
    CategoryRepository,
    ItemRepository,
} from "@/modules/menu/repositories/menu-repo";
import type { PromotionRepository } from "@/modules/promotion/repositories/promotion-repo";
import { evaluateGreetingPromotions } from "@/modules/promotion/usecases/promotion-evaluator";
import { renderMessage, type RenderContext } from "../../render-message";
import { buildCategorySections, buildItemSections } from "../flow-cart";
import type { ListSection } from "../flow-list-types";
import { buildListOptionMap, renderListAsText } from "../flow-option-map";
import { BACK_ID, type SendResult } from "../flow-shared";
import type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";

/**
 * Renders MENU steps as a numbered plain-text list. Two phases, switched by
 * `flowState.phase`:
 *  - CATEGORY: lists all org categories. Prepended with any active greeting
 *    promotions (daily message + Nth-order teasers) and their featured item.
 *  - PRODUCT: lists items inside `flowState.selectedCategoryId`, filtered by
 *    `availableDaysOfWeek` so day-restricted items only show on their days.
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
        // Items with an empty `availableDaysOfWeek` are available every day;
        // otherwise only on the listed weekdays. Items flagged `available=false`
        // are always hidden.
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
        const sections = buildCategorySections(categories);
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

        // Parallel lookups for featured items; missing/deleted items are skipped.
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
