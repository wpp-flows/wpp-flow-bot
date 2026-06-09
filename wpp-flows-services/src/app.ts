import fastify, { FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import { env } from "@/infrastructure/config/env";
import { globalErrorHandler } from "@/infrastructure/http/error-handler";
import { registerRoutes } from "./infrastructure/http/decorators/route-decorator";
import { adminRoutes } from "./modules/admin/http/routes";
import { authRoutes } from "./modules/auth/http/routes";
import { botRoutes } from "./modules/bot/http/routes";
import { chatRoutes } from "./modules/chat/http/routes";
import { couponRoutes } from "./modules/coupon/http/routes";
import { dashboardRoutes } from "./modules/dashboard/http/routes";
import { flowRoutes } from "./modules/flow/http/routes";
import { menuRoutes } from "./modules/menu/http/routes";
import { orderRoutes } from "./modules/order/http/routes";
import { organizationRoutes } from "./modules/organization/http/routes";
import { notificationRoutes } from "./modules/notification/http/routes";
import { paymentRoutes } from "./modules/payment/http/routes";
import { promotionRoutes } from "./modules/promotion/http/routes";
import { localServiceRoutes } from "./modules/local-service/http/routes";
import { publicMenuRoutes } from "./modules/public-menu/http/routes";
import { publicOrdersRoutes } from "./modules/public-orders/http/routes";
import { realtimeRoutes } from "./modules/realtime/http/routes";
import { reportRoutes } from "./modules/reports/http/routes";
import { uploadRoutes } from "./modules/uploads/http/routes";
import { webhookRoutes } from "./modules/webhook/http/routes";

export const app = fastify({
  logger: env.NODE_ENV !== "production",
  connectionTimeout: 600000,
  keepAliveTimeout: 605000,
  requestTimeout: 600000,
});

app.register(fastifyCors, {
  origin: [env.CLIENT_ORIGIN],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400,
});

app.register(fastifyMultipart, {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, //5 mb
});

// tava dando uns erro random de webhook, isso aq soluciona
app.addContentTypeParser("*", { parseAs: "string" }, (_req, body, done) => {
  if (!body || (typeof body === "string" && body.length === 0)) {
    done(null, undefined);
    return;
  }
  try {
    done(null, JSON.parse(body as string));
  } catch {
    done(null, body);
  }
});

app.setErrorHandler(globalErrorHandler);

registerRoutes(app, [
  ...authRoutes,
  ...adminRoutes,
  ...organizationRoutes,
  ...botRoutes,
  ...menuRoutes,
  ...flowRoutes,
  ...chatRoutes,
  ...dashboardRoutes,
  ...orderRoutes,
  ...paymentRoutes,
  ...promotionRoutes,
  ...couponRoutes,
  ...publicMenuRoutes,
  ...publicOrdersRoutes,
  ...localServiceRoutes,
  ...realtimeRoutes,
  ...reportRoutes,
  ...uploadRoutes,
  ...notificationRoutes,
  ...webhookRoutes,
]);

app.get("/health", (_, reply: FastifyReply) => {
  return reply.send({
    name: "wpp-flows-services",
    status: "healthy",
  });
});
