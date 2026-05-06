import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../database/client";

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:3000", "https://example.com"],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  },
  ),
  emailAndPassword: {
    enabled: true,
  },

});