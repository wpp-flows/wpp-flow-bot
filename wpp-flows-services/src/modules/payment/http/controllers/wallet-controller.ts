import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import {
    makeCancelWithdrawal,
    makeGetWallet,
    makeListWalletTransactions,
    makeRequestWithdrawal,
} from "../../usecases/factories";
import { requestWithdrawalSchema } from "../schema";
import type { FastifyReply, FastifyRequest } from "fastify";

export class WalletController {
    @Route("GET", "/api/wallet", { middlewares: [requireOrganization] })
    async getWallet(request: FastifyRequest, reply: FastifyReply) {
        const wallet = await makeGetWallet().execute(request.organizationId);
        return reply.send(wallet);
    }

    @Route("GET", "/api/wallet/transactions", {
        middlewares: [requireOrganization],
    })
    async listTransactions(request: FastifyRequest, reply: FastifyReply) {
        const tx = await makeListWalletTransactions().execute(
            request.organizationId,
        );
        return reply.send(tx);
    }

    @Route("POST", "/api/wallet/withdrawals", {
        middlewares: [requireOrganization],
    })
    async requestWithdrawal(request: FastifyRequest, reply: FastifyReply) {
        const body = requestWithdrawalSchema.parse(request.body);
        const tx = await makeRequestWithdrawal().execute({
            organizationId: request.organizationId,
            amount: body.amount,
            note: body.note,
        });
        return reply.status(201).send(tx);
    }

    @Route("POST", "/api/wallet/withdrawals/:id/cancel", {
        middlewares: [requireOrganization],
    })
    async cancelWithdrawal(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const tx = await makeCancelWithdrawal().execute({
            organizationId: request.organizationId,
            transactionId: id,
        });
        return reply.send(tx);
    }
}
