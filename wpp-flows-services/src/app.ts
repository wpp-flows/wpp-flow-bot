import fastify, { FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import { env } from "@/infrastructure/config/env";
import { globalErrorHandler } from "@/infrastructure/http/error-handler";
import { registerRoutes } from "./infrastructure/http/decorators/route-decorator";
import { authRoutes } from "./modules/auth/http/routes";
import { botRoutes } from "./modules/bot/http/routes";
import { chatRoutes } from "./modules/chat/http/routes";
import { flowRoutes } from "./modules/flow/http/routes";
import { flowStepRoutes } from "./modules/flow-step/http/routes";
import { menuRoutes } from "./modules/menu/http/routes";
import { organizationRoutes } from "./modules/organization/http/routes";
import { webhookRoutes } from "./modules/webhook/http/routes";

export const app = fastify({
  logger: env.NODE_ENV !== "production",
  connectionTimeout: 600000,
  keepAliveTimeout: 605000,
  requestTimeout: 600000,
});

app.register(fastifyCors, {
  origin: env.CLIENT_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400,
});

app.setErrorHandler(globalErrorHandler);

registerRoutes(app, [
  ...authRoutes,
  ...organizationRoutes,
  ...botRoutes,
  ...menuRoutes,
  ...flowRoutes,
  ...flowStepRoutes,
  ...chatRoutes,
  ...webhookRoutes,
]);

app.get("/health", (_, reply: FastifyReply) => {
  return reply.send({
    name: "wpp-flows-services",
    status: "healthy",
  });
});
