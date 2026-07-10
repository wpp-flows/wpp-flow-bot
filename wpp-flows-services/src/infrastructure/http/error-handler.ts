import { CloudApiError } from "@/infrastructure/whatsapp/cloud-api-client";
import { HttpError } from "@/shared/exceptions/http";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function globalErrorHandler(
    error: FastifyError,
    _request: FastifyRequest,
    reply: FastifyReply
) {
    if (error instanceof ZodError) {
        return reply.status(400).send({
            error: "Validation failed",
            issues: error.issues,
        });
    }

    if (error instanceof HttpError) {
        return reply.status(error.status).send({ error: error.message });
    }

    if (error instanceof CloudApiError) {
        return reply.status(502).send({
            error: error.message,
            details: error.body,
        });
    }

    if ((error as any).code === "P2002") {
        return reply.status(409).send({ error: "Unique constraint violation." });
    }
    if ((error as any).code === "P2025") {
        return reply.status(404).send({ error: "Resource not found." });
    }

    console.error("Unhandled error:", error);
    return reply.status(error.statusCode ?? 500).send({
        error: error.message ?? "Internal server error",
    });
}
