import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import {
    orgEventBus,
    type RealtimeEvent,
} from "@/infrastructure/events/event-bus";
import { tableRepo } from "@/modules/local-service/usecases/factories";
import { NotFoundError } from "@/shared/exceptions/http";
import type { FastifyReply, FastifyRequest } from "fastify";

const HEARTBEAT_MS = 25_000;

function openStream(
    request: FastifyRequest,
    reply: FastifyReply,
): { send: (event: RealtimeEvent | { kind: "ping" }) => void; close: () => void } {

    for (const [key, value] of Object.entries(reply.getHeaders())) {
        if (value !== undefined && value !== null) {
            reply.raw.setHeader(key, value as string | string[] | number);
        }
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();
    reply.hijack();

    const send = (event: RealtimeEvent | { kind: "ping" }) => {
        if (reply.raw.writableEnded) return;
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    reply.raw.write(": connected\n\n");

    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        reply.raw.end();
    };

    const heartbeat = setInterval(() => {
        if (reply.raw.writableEnded) {
            clearInterval(heartbeat);
            return;
        }

        reply.raw.write(": ping\n\n");
    }, HEARTBEAT_MS);

    request.raw.on("close", close);

    return { send, close };
}

export class RealtimeController {
    @Route("GET", "/api/realtime/events", {
        middlewares: [requireOrganization],
    })
    async orgStream(request: FastifyRequest, reply: FastifyReply) {
        const stream = openStream(request, reply);
        const unsubscribe = orgEventBus.subscribe(
            request.organizationId,
            (event) => stream.send(event),
        );
        request.raw.on("close", unsubscribe);
    }

    @Route("GET", "/api/public/tables/:token/events")
    async tableStream(request: FastifyRequest, reply: FastifyReply) {
        const { token } = request.params as { token: string };
        const table = await tableRepo.findByToken(token);
        if (!table) throw new NotFoundError("Mesa");

        const stream = openStream(request, reply);
        const unsubscribe = orgEventBus.subscribe(
            table.organizationId,
            (event) => {
                const eventTableId =
                    "tableId" in event ? event.tableId : null;
                if (eventTableId === table.id) {
                    stream.send(event);
                }
            },
        );
        request.raw.on("close", unsubscribe);
    }
}
