import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import {
    makeGetWallet,
    makeListWalletTransactions,
} from "../../usecases/factories";
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
}
