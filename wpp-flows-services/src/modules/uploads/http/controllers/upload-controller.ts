import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import { ValidationError } from "@/shared/exceptions/http";
import { storageClient } from "@/infrastructure/storage/factory";
import type { FastifyReply, FastifyRequest } from "fastify";

const ALLOWED_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
]);

function extensionFor(mime: string): string {
    switch (mime) {
        case "image/png": return "png";
        case "image/jpeg": return "jpg";
        case "image/webp": return "webp";
        case "image/gif": return "gif";
        default: return "bin";
    }
}

export class UploadController {
    @Route("POST", "/api/uploads/menu-item", {
        middlewares: [requireOrganization],
    })
    async uploadMenuItemImage(request: FastifyRequest, reply: FastifyReply) {
        const part = await request.file();
        if (!part) throw new ValidationError("Nenhum arquivo enviado.");

        if (!ALLOWED_MIME_TYPES.has(part.mimetype)) {
            throw new ValidationError(
                "Tipo de arquivo não suportado. Envie PNG, JPG, WEBP ou GIF.",
            );
        }

        const buffer = await part.toBuffer();
        // fastify-multipart sets `truncated` when the file exceeded the limit
        // configured at app.ts:register-time (5 MB).
        if (part.file.truncated) {
            throw new ValidationError("Arquivo muito grande (máx. 5 MB).");
        }

        const key = `menu-items/${request.organizationId}/${crypto.randomUUID()}.${extensionFor(part.mimetype)}`;
        const result = await storageClient.upload({
            key,
            body: buffer,
            contentType: part.mimetype,
        });

        return reply.status(201).send({ url: result.publicUrl, key: result.key });
    }
}
