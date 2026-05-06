import fastify, { FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import { registerRoutes } from "./infrastructure/http/decorators/route-decorator";
import { authRoutes } from "./modules/auth/http/routes";

export const app = fastify({
    logger: process.env.NODE_ENV !== "production",
    connectionTimeout: 600000, // 10 minutos
    keepAliveTimeout: 605000, // 10 minutos + 5 segundos buffer
    requestTimeout: 600000 // 10 minutos pra toda a req
});

app.register(fastifyCors, {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With"
    ],
    credentials: true,
    maxAge: 86400
});

registerRoutes(app, authRoutes);

app.get('/health', (_, reply: FastifyReply) => {
    return reply.send({
        name: 'ifsp-project-api',
        status: 'healthy'
    })
})