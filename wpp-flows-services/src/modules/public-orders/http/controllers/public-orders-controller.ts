import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { organizationRepo } from "@/modules/organization/usecases/factories";
import { orderRepo } from "@/modules/order/usecases/factories";
import { botRepo } from "@/modules/bot/usecases/factories";
import { NotFoundError } from "@/shared/exceptions/http";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    cancelPublicOrder,
    createPublicOrder,
    getCustomerContext,
    validatePublicCoupon,
} from "../../usecases/factories";
import {
    createPublicOrderSchema,
    customerContextQuerySchema,
    validateCouponQuerySchema,
} from "../schema";

export class PublicOrdersController {
    @Route("POST", "/api/public/orders/:slug")
    async create(request: FastifyRequest, reply: FastifyReply) {
        const { slug } = request.params as { slug: string };
        const body = createPublicOrderSchema.parse(request.body);
        const result = await createPublicOrder.execute({
            slug,
            customer: body.customer,
            items: body.items,
            observation: body.observation ?? null,
            address: body.address ?? null,
            deliveryMode: body.deliveryMode,
            couponCode: body.couponCode ?? null,
            paymentMethod: body.paymentMethod,
            cashChangeFor: body.cashChangeFor ?? null,
        });
        return reply.status(201).send(result);
    }

    @Route("GET", "/api/public/orders/:slug/coupons/validate")
    async validateCoupon(request: FastifyRequest, reply: FastifyReply) {
        const { slug } = request.params as { slug: string };
        const { code, subtotal } = validateCouponQuerySchema.parse(request.query);
        const result = await validatePublicCoupon.execute({ slug, code, subtotal });
        return reply.send(result);
    }

    @Route("GET", "/api/public/orders/:slug/customer-context")
    async customerContext(request: FastifyRequest, reply: FastifyReply) {
        const { slug } = request.params as { slug: string };
        const { phone } = customerContextQuerySchema.parse(request.query);
        const result = await getCustomerContext.execute({ slug, phone });
        return reply.send(result);
    }

    @Route("GET", "/api/public/orders/:slug/:orderId")
    async getStatus(request: FastifyRequest, reply: FastifyReply) {
        const { slug, orderId } = request.params as {
            slug: string;
            orderId: string;
        };
        const org = await organizationRepo.findBySlug(slug);
        if (!org) throw new NotFoundError("Restaurant");
        const order = await orderRepo.findByIdInOrg(org.id, orderId);
        if (!order) throw new NotFoundError("Order");

        const bots = await botRepo.listByOrg(org.id);
        const bot = bots.find((b) => b.status === "ONLINE") ?? bots[0] ?? null;

        return reply.send({
            id: order.id,
            sequence: order.sequence,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total: order.total,
            paymentLink: order.paymentLink,
            bot: bot
                ? {
                    phoneNumber: bot.phoneNumber,
                }
                : null,
        });
    }

    @Route("POST", "/api/public/orders/:slug/:orderId/cancel")
    async cancel(request: FastifyRequest, reply: FastifyReply) {
        const { slug, orderId } = request.params as {
            slug: string;
            orderId: string;
        };
        await cancelPublicOrder.execute({ slug, orderId });
        return reply.status(204).send();
    }
}
