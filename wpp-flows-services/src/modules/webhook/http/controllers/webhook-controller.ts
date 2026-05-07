import { Route } from "@/infrastructure/http/decorators/route-decorator";
import type { FastifyReply, FastifyRequest } from "fastify";
import { makeHandleEvolutionEvent } from "../../usecases/factories";

export class WebhookController {
    @Route("POST", "/api/webhooks/evolution/:instance")
    async receive(request: FastifyRequest, reply: FastifyReply) {
        const { instance } = request.params as { instance: string };
        const body = (request.body ?? {}) as {
            event?: string;
            instance?: string;
            data?: any;
        };

        if (!body.event) {
            return reply.status(400).send({ error: "Missing event field." });
        }

        const useCase = makeHandleEvolutionEvent();
        await useCase.execute({
            event: body.event,
            instance: body.instance ?? instance,
            data: body.data,
        });
        return reply.status(204).send();
    }
}
