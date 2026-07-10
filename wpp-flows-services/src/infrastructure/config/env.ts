import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.coerce.number().default(8080),
    APP_DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.url(),
    CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
    /**
     * Public base URL for this API, used by Mercado Pago to call us back.
     * Required only when MP is configured for an organization.
     */
    PUBLIC_API_URL: z.string().optional(),
    COOKIE_DOMAIN: z.string().optional(),
    REDIS_URL: z.string().default("redis://redis:6379"),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_STORAGE_BUCKET: z.string().default("mesa-uploads"),
    RESEND_API_KEY: z.string().optional(),
    INVITE_FROM_EMAIL: z.string().default("Conecta IA <onboarding@resend.dev>"),
    /**
     * Meta WhatsApp Cloud API. All optional so the app still boots on the
     * Evolution-only path; the Cloud gateway checks `isMetaConfigured()` and
     * fails with a clear error if a CLOUD_API bot is used without them.
     *
     * META_APP_ID / META_APP_SECRET — the Meta app; also verifies the inbound
     *   X-Hub-Signature-256 and exchanges Embedded Signup codes for tokens.
     * META_SYSTEM_USER_TOKEN — long-lived System User token for app-level calls
     *   (subscribing client WABAs; fallback sends in dev/single-tenant).
     * META_EMBEDDED_SIGNUP_CONFIG_ID — Facebook Login for Business config id
     *   driving the Embedded Signup popup on the frontend.
     * META_WEBHOOK_VERIFY_TOKEN — echoed on the GET verification handshake.
     * META_GRAPH_VERSION — Graph API version (e.g. "v21.0").
     * WHATSAPP_TOKEN_ENC_KEY — 32-byte base64 key; encrypts per-bot access
     *   tokens at rest (AES-256-GCM).
     */
    META_APP_ID: z.string().optional(),
    META_APP_SECRET: z.string().optional(),
    META_SYSTEM_USER_TOKEN: z.string().optional(),
    META_EMBEDDED_SIGNUP_CONFIG_ID: z.string().optional(),
    META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
    META_GRAPH_VERSION: z.string().default("v21.0"),
    /**
     * 6-digit two-step-verification PIN used when registering a client's phone
     * number for Cloud API messaging right after Embedded Signup. Same PIN for
     * every onboarded number — it's our platform's registration credential.
     */
    META_PHONE_REGISTER_PIN: z.string().regex(/^\d{6}$/).default("152663"),
    WHATSAPP_TOKEN_ENC_KEY: z.string().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
    console.error('❌ Invalid Environment Variables', z.treeifyError(parsed.error))

    throw new Error('Invalid Environment Variables.')
}

export const env = {
    ...parsed.data,
    IS_DEVELOP_MODE: parsed.data.NODE_ENV === 'development'
}
