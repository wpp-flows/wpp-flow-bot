import { Route } from "@/infrastructure/http/decorators/route-decorator";
import {
    buildOutOfHoursMessage,
    isWithinWorkingHours,
    workingHoursFor,
} from "@/modules/organization/working-hours";
import { categoryRepo, itemRepo } from "@/modules/menu/usecases/factories";
import { organizationRepo } from "@/modules/organization/usecases/factories";
import { botRepo } from "@/modules/bot/usecases/factories";
import { promotionRepo } from "@/modules/promotion/usecases/factories";
import { NotFoundError } from "@/shared/exceptions/http";
import type { FastifyReply, FastifyRequest } from "fastify";

export class PublicMenuController {
    @Route("GET", "/api/public/menu/:slug")
    async getMenu(request: FastifyRequest, reply: FastifyReply) {
        const { slug } = request.params as { slug: string };
        const query = (request.query ?? {}) as { serviceType?: string };
        const serviceType =
            query.serviceType === "LOCAL" ? "LOCAL" : "DELIVERY";
        const org = await organizationRepo.findBySlug(slug);
        if (!org) throw new NotFoundError("Restaurant");

        // dps ver de fazer em uma query só
        const [categories, items, promotions, bots] = await Promise.all([
            categoryRepo.listByOrg(org.id),
            itemRepo.listByOrg(org.id),
            promotionRepo.listActive(org.id),
            botRepo.listByOrg(org.id),
        ]);

        const today = new Date().getDay();
        const visibleItems = items.filter((it) => {
            if (!it.available) return false;
            if (
                it.availableDaysOfWeek.length > 0 &&
                !it.availableDaysOfWeek.includes(today)
            ) {
                return false;
            }

            if (serviceType === "LOCAL") return it.availableForLocal;
            return it.availableForDelivery;
        });

        const visiblePromotions = promotions.filter((p) => {
            if (p.kind !== "DAILY_MESSAGE") return true;
            return p.daysOfWeek.length === 0 || p.daysOfWeek.includes(today);
        });

        const onlineBot = bots.find((b) => b.status === "ONLINE") ?? bots[0] ?? null;

        const hours = workingHoursFor(org, serviceType);
        const isOpen = isWithinWorkingHours(hours);
        const closedMessage = isOpen ? null : buildOutOfHoursMessage(hours);

        return reply.send({
            organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
                deliveryFee: org.deliveryFee,
            },
            categories: categories.map((c) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                position: c.position,
            })),
            items: visibleItems.map((it) => ({
                id: it.id,
                categoryId: it.categoryId,
                name: it.name,
                description: it.description,
                price: it.price,
                imageUrl: it.imageUrl,
                position: it.position,
                additionals: it.additionals,
            })),
            promotions: visiblePromotions.map((p) => ({
                id: p.id,
                kind: p.kind,
                name: p.name,
                message: p.message,
                featuredItemId: p.featuredItemId,
                promotionalPrice: p.promotionalPrice,
                nthOrder: p.nthOrder,
                discountType: p.discountType,
                discountValue: p.discountValue,
                teaserOrderOffset: p.teaserOrderOffset,
                teaserMessage: p.teaserMessage,
                qualifyingMessage: p.qualifyingMessage,
                bundle: p.bundle,
            })),
            bot: onlineBot
                ? {
                    id: onlineBot.id,
                    phoneNumber: onlineBot.phoneNumber,
                    status: onlineBot.status,
                }
                : null,
            isOpen,
            closedMessage,
        });
    }
}
