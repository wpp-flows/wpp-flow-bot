import {
    evolutionApi,
    type EvolutionButton,
    type EvolutionListSection,
    type EvolutionSendTextResponse,
} from "@/infrastructure/evolution/client";
import type { Bot } from "@/modules/bot/repositories/bot-repo";
import type {
    Conversation,
    ConversationRepository,
    FlowCartItem,
    FlowState,
    MessageRepository,
} from "@/modules/chat/repositories/chat-repo";
import type {
    FlowRepository,
    FlowStep,
    FlowWithSteps,
} from "@/modules/flow/repositories/flow-repo";
import type {
    CategoryRepository,
    ItemRepository,
    MenuCategory,
    MenuItem,
} from "@/modules/menu/repositories/menu-repo";
import { jidToSendTarget } from "./strategies/shared";

const BACK_ID = "back";
const CONFIRM_ID = "confirm";
const ADD_MORE_ID = "add_more";
const CANCEL_ID = "cancel";
const CATEGORY_PREFIX = "cat:";
const ITEM_PREFIX = "item:";

const initialState = (): FlowState => ({
    phase: "CATEGORY",
    selectedCategoryId: null,
    cart: [],
});

/**
 * Interactive, menu-aware flow runner.
 *
 * Flow shape (driven by FlowStep types):
 *   MENU step  → Category list → Product list (sendList)
 *   CONFIRMATION step → Confirm / Add more / Back (sendButtons)
 *   MESSAGE / PAYMENT  → plain text (sendText)
 *
 * Navigation is button/list-driven. Button IDs use prefixes so the runner can route
 * selections back to the right action: cat:<id>, item:<id>, back, confirm, add_more, cancel.
 */
export class FlowRunner {
    constructor(
        private readonly flowRepo: FlowRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly messageRepo: MessageRepository,
        private readonly categoryRepo: CategoryRepository,
        private readonly itemRepo: ItemRepository
    ) { }

    async handleInbound(input: {
        bot: Bot;
        conversation: Conversation;
        selectionId?: string | null;
        text?: string | null;
    }): Promise<void> {
        const { bot, conversation, selectionId } = input;
        if (!conversation.botActive) return;

        const flow = await this.resolveFlow(bot);
        if (!flow || flow.steps.length === 0) return;

        const sortedSteps = sortSteps(flow.steps);
        const currentStep = findStep(sortedSteps, conversation.currentStepId);

        // cold start no current step -> send first step.
        if (!currentStep) {
            const first = sortedSteps[0];
            if (!first) return;
            const fresh = initialState();
            await this.deliverStep({
                bot,
                conversation,
                step: first,
                state: fresh,
                allSteps: sortedSteps,
            });
            return;
        }

        const state = conversation.flowState ?? initialState();
        const transition = await this.applyInput({
            organizationId: bot.organizationId,
            steps: sortedSteps,
            currentStep,
            state,
            selectionId: selectionId ?? null,
        });

        await this.deliverStep({
            bot,
            conversation,
            step: transition.step,
            state: transition.state,
            allSteps: sortedSteps,
        });
    }

    private async resolveFlow(bot: Bot): Promise<FlowWithSteps | null> {
        if (bot.flowId) {
            const explicit = await this.flowRepo.findByIdInOrg(
                bot.organizationId,
                bot.flowId
            );
            if (explicit) return explicit;
        }
        return this.flowRepo.findActive(bot.organizationId);
    }

    /**
     * Resolves the (next step, next state) for a given input. Pure routing — no I/O
     * other than reading the menu data when needed.
     */
    private async applyInput(input: {
        organizationId: string;
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string | null;
    }): Promise<{ step: FlowStep; state: FlowState }> {
        const { steps, currentStep, state, selectionId } = input;

        // without an interactive selection we just re-deliver the current step
        // (the bot keeps nudging the user toward the buttons/list).
        if (!selectionId) return { step: currentStep, state };

        switch (currentStep.type) {
            case "MENU":
                return this.applyMenuInput({
                    organizationId: input.organizationId,
                    steps,
                    currentStep,
                    state,
                    selectionId,
                });
            case "CONFIRMATION":
                return this.applyConfirmationInput({
                    steps,
                    currentStep,
                    state,
                    selectionId,
                });
            default:
                return this.applyLinearInput({ steps, currentStep, state, selectionId });
        }
    }

    private async applyMenuInput(input: {
        organizationId: string;
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string;
    }): Promise<{ step: FlowStep; state: FlowState }> {
        const { steps, currentStep, state, selectionId } = input;

        if (selectionId === BACK_ID) {
            // CATEGORY -> no-op (we're already at the top).
            // PRODUCT  -> back to category list.
            if (state.phase === "PRODUCT") {
                return {
                    step: currentStep,
                    state: { ...state, phase: "CATEGORY", selectedCategoryId: null },
                };
            }
            return { step: currentStep, state };
        }

        if (selectionId.startsWith(CATEGORY_PREFIX)) {
            const categoryId = selectionId.slice(CATEGORY_PREFIX.length);
            return {
                step: currentStep,
                state: {
                    ...state,
                    phase: "PRODUCT",
                    selectedCategoryId: categoryId,
                },
            };
        }

        if (selectionId.startsWith(ITEM_PREFIX)) {
            const itemId = selectionId.slice(ITEM_PREFIX.length);
            const item = await this.itemRepo.findByIdInOrg(
                input.organizationId,
                itemId
            );
            const cart = item ? appendToCart(state.cart, item) : state.cart;

            // move to the next step (typically CONFIRMATION). If there isn't one
            // we just stay in PRODUCT phase so the user can keep ordering.
            const next = nextStep(steps, currentStep.id);
            if (!next) {
                return {
                    step: currentStep,
                    state: { ...state, cart },
                };
            }
            return {
                step: next,
                state: { ...state, cart, phase: phaseForStep(next) },
            };
        }

        return { step: currentStep, state };
    }

    private applyConfirmationInput(input: {
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string;
    }): { step: FlowStep; state: FlowState } {
        const { steps, currentStep, state, selectionId } = input;

        if (selectionId === BACK_ID) {
            const prev = previousStep(steps, currentStep.id);
            if (!prev) return { step: currentStep, state };
            return {
                step: prev,
                state: { ...state, phase: phaseForStep(prev) },
            };
        }

        if (selectionId === ADD_MORE_ID) {
            const menu = findFirstStepOfType(steps, "MENU") ?? currentStep;
            return {
                step: menu,
                state: { ...state, phase: "CATEGORY", selectedCategoryId: null },
            };
        }

        if (selectionId === CANCEL_ID) {
            const first = steps[0];
            if (!first) return { step: currentStep, state };
            return { step: first, state: initialState() };
        }

        if (selectionId === CONFIRM_ID) {
            const next = nextStep(steps, currentStep.id);
            if (!next) {
                return {
                    step: currentStep,
                    state: { ...state, phase: "DONE" },
                };
            }
            return { step: next, state: { ...state, phase: phaseForStep(next) } };
        }

        return { step: currentStep, state };
    }

    private applyLinearInput(input: {
        steps: FlowStep[];
        currentStep: FlowStep;
        state: FlowState;
        selectionId: string;
    }): { step: FlowStep; state: FlowState } {
        const { steps, currentStep, state, selectionId } = input;

        if (selectionId === BACK_ID) {
            const prev = previousStep(steps, currentStep.id);
            if (!prev) return { step: currentStep, state };
            return { step: prev, state: { ...state, phase: phaseForStep(prev) } };
        }

        const next = nextStep(steps, currentStep.id);
        if (!next) return { step: currentStep, state };
        return { step: next, state: { ...state, phase: phaseForStep(next) } };
    }

    private async deliverStep(input: {
        bot: Bot;
        conversation: Conversation;
        step: FlowStep;
        state: FlowState;
        allSteps: FlowStep[];
    }): Promise<void> {
        const { bot, conversation, step, state, allSteps } = input;
        const phoneNumber = jidToSendTarget(conversation.remoteJid);
        const canGoBack = previousStep(allSteps, step.id) !== null;

        try {
            const { evolutionResp, preview } = await this.send({
                bot,
                phoneNumber,
                step,
                state,
                canGoBack,
            });

            const message = await this.messageRepo.create({
                conversationId: conversation.id,
                evolutionMessageId: evolutionResp.key.id,
                author: "BOT",
                content: preview,
                status: "SENT",
            });

            await this.conversationRepo.update(conversation.id, {
                currentStepId: step.id,
                flowState: state,
                lastMessagePreview: preview.slice(0, 100),
                lastMessageAt: message.createdAt,
            });
        } catch (err) {
            console.error("Failed to deliver flow step:", err);
            await this.messageRepo.create({
                conversationId: conversation.id,
                author: "SYSTEM",
                content: `⚠️ Bot couldn't reply: ${describeSendError(err)}`,
                status: "FAILED",
            });
        }
    }

    private async send(input: {
        bot: Bot;
        phoneNumber: string;
        step: FlowStep;
        state: FlowState;
        canGoBack: boolean;
    }): Promise<{ evolutionResp: EvolutionSendTextResponse; preview: string }> {
        const { bot, phoneNumber, step, state, canGoBack } = input;

        if (step.type === "MENU") {
            return this.sendMenuStep({
                bot,
                phoneNumber,
                step,
                state,
                canGoBack,
            });
        }

        if (step.type === "CONFIRMATION") {
            return this.sendConfirmationStep({ bot, phoneNumber, step, state });
        }

        const text = renderPlainStep(step);
        const evolutionResp = await evolutionApi.sendText({
            instanceName: bot.evolutionInstanceName,
            number: phoneNumber,
            text,
        });
        return { evolutionResp, preview: text };
    }

    private async sendMenuStep(input: {
        bot: Bot;
        phoneNumber: string;
        step: FlowStep;
        state: FlowState;
        canGoBack: boolean;
    }): Promise<{ evolutionResp: EvolutionSendTextResponse; preview: string }> {
        const { bot, phoneNumber, step, state } = input;
        const organizationId = bot.organizationId;

        if (state.phase === "PRODUCT" && state.selectedCategoryId) {
            const items = await this.itemRepo.listByCategory(state.selectedCategoryId);
            const category = await this.categoryRepo.findByIdInOrg(
                organizationId,
                state.selectedCategoryId
            );
            const sections = buildItemSections(items);
            const title = category?.name ?? "Itens";
            const description = items.length
                ? "Escolha um item para adicionar ao pedido."
                : "Esta categoria ainda não tem itens disponíveis.";
            const evolutionResp = await this.dispatchMenu({
                bot,
                phoneNumber,
                title,
                description,
                buttonText: "Ver itens",
                sections,
                backRow: { rowId: BACK_ID, title: "⬅️ Voltar para categorias" },
            });
            return {
                evolutionResp,
                preview: `${title}: ${items.length} itens`,
            };
        }

        const categories = await this.categoryRepo.listByOrg(organizationId);
        const sections = buildCategorySections(categories);
        const title = step.content || "Cardápio";
        const description = categories.length
            ? "Escolha uma categoria para começar."
            : "Nenhuma categoria disponível no momento.";

        const evolutionResp = await this.dispatchMenu({
            bot,
            phoneNumber,
            title,
            description,
            buttonText: "Ver categorias",
            sections,
            backRow: null,
        });
        return {
            evolutionResp,
            preview: `${title}: ${categories.length} categorias`,
        };
    }

    private async dispatchMenu(input: {
        bot: Bot;
        phoneNumber: string;
        title: string;
        description: string;
        buttonText: string;
        sections: EvolutionListSection[];
        backRow: { rowId: string; title: string } | null;
    }): Promise<EvolutionSendTextResponse> {
        const sections =
            input.backRow && input.sections.length > 0
                ? [
                    ...input.sections,
                    { title: "Navegação", rows: [input.backRow] },
                ]
                : input.sections;

        if (sections.length === 0) {
            // fallback pra caso nao tenha categorias nem itens
            return evolutionApi.sendText({
                instanceName: input.bot.evolutionInstanceName,
                number: input.phoneNumber,
                text: `${input.title}\n\n${input.description}`,
            });
        }

        return evolutionApi.sendList({
            instanceName: input.bot.evolutionInstanceName,
            number: input.phoneNumber,
            title: input.title,
            description: input.description,
            buttonText: input.buttonText,
            sections,
        });
    }

    private async sendConfirmationStep(input: {
        bot: Bot;
        phoneNumber: string;
        step: FlowStep;
        state: FlowState;
    }): Promise<{ evolutionResp: EvolutionSendTextResponse; preview: string }> {
        const { bot, phoneNumber, step, state } = input;
        const cartLines = state.cart.length
            ? state.cart
                .map(
                    (entry) =>
                        `• ${entry.qty}x ${entry.name} (R$ ${entry.price})`
                )
                .join("\n")
            : "Seu carrinho está vazio.";

        const text = `${step.content}\n\n${cartLines}`;
        const buttons: EvolutionButton[] = [
            { buttonId: CONFIRM_ID, buttonText: { displayText: "✅ Confirmar" } },
            { buttonId: ADD_MORE_ID, buttonText: { displayText: "➕ Adicionar mais" } },
            { buttonId: BACK_ID, buttonText: { displayText: "⬅️ Voltar" } },
        ];

        const evolutionResp = await evolutionApi.sendButtons({
            instanceName: bot.evolutionInstanceName,
            number: phoneNumber,
            text,
            buttons,
            footerText: "Selecione uma opção para continuar.",
        });
        return { evolutionResp, preview: text };
    }
}

function sortSteps(steps: FlowStep[]): FlowStep[] {
    return [...steps].sort((a, b) => a.order - b.order);
}

function findStep(steps: FlowStep[], id: string | null): FlowStep | null {
    if (!id) return null;
    return steps.find((s) => s.id === id) ?? null;
}

function nextStep(steps: FlowStep[], currentId: string): FlowStep | null {
    const idx = steps.findIndex((s) => s.id === currentId);
    if (idx < 0) return null;
    return steps[idx + 1] ?? null;
}

function previousStep(steps: FlowStep[], currentId: string): FlowStep | null {
    const idx = steps.findIndex((s) => s.id === currentId);
    if (idx <= 0) return null;
    return steps[idx - 1] ?? null;
}

function findFirstStepOfType(
    steps: FlowStep[],
    type: FlowStep["type"]
): FlowStep | null {
    return steps.find((s) => s.type === type) ?? null;
}

function phaseForStep(step: FlowStep): FlowState["phase"] {
    if (step.type === "MENU") return "CATEGORY";
    if (step.type === "CONFIRMATION") return "CONFIRMATION";
    return "DONE";
}

function appendToCart(cart: FlowCartItem[], item: MenuItem): FlowCartItem[] {
    const existing = cart.find((c) => c.itemId === item.id);
    if (existing) {
        return cart.map((c) =>
            c.itemId === item.id ? { ...c, qty: c.qty + 1 } : c
        );
    }
    return [
        ...cart,
        {
            itemId: item.id,
            name: item.name,
            price: String(item.price),
            qty: 1,
        },
    ];
}

function buildCategorySections(
    categories: MenuCategory[]
): EvolutionListSection[] {
    if (categories.length === 0) return [];
    return [
        {
            title: "Categorias",
            rows: categories.map((cat) => ({
                rowId: `${CATEGORY_PREFIX}${cat.id}`,
                title: cat.name,
                description: cat.description ?? undefined,
            })),
        },
    ];
}

function buildItemSections(items: MenuItem[]): EvolutionListSection[] {
    if (items.length === 0) return [];
    return [
        {
            title: "Itens",
            rows: items.map((item) => ({
                rowId: `${ITEM_PREFIX}${item.id}`,
                title: item.name,
                description: `R$ ${item.price}${item.description ? ` — ${item.description}` : ""
                    }`,
            })),
        },
    ];
}

function describeSendError(err: unknown): string {
    const e = err as {
        body?: {
            response?: { message?: Array<{ exists?: boolean; jid?: string }> };
        };
        message?: string;
    };
    const detail = e?.body?.response?.message?.[0];
    if (detail?.exists === false) {
        return `the WhatsApp number ${detail.jid ?? ""} does not exist`;
    }
    return e?.message ?? "unknown Evolution API error";
}

function renderPlainStep(step: FlowStep): string {
    if (step.type === "PAYMENT") {
        const meta = step.metadata as
            | { paymentLink?: string; total?: number | string }
            | null;
        if (meta?.paymentLink) {
            return `${step.content}\n\nPay here: ${meta.paymentLink}`;
        }
    }
    return step.content;
}
