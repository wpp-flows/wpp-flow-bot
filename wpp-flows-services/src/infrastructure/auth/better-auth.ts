import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "../config/env";
import { prisma } from "../database/client";

export const auth = betterAuth({
  trustedOrigins: [env.CLIENT_ORIGIN],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
});