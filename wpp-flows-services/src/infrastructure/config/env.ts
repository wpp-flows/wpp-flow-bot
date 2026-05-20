import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.coerce.number().default(8080),
    APP_DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.url(),
    CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
    EVOLUTION_API_URL: z.string(),
    EVOLUTION_API_KEY: z.string(),
    EVOLUTION_WEBHOOK_URL: z.string().optional(),
    /**
     * Public base URL for this API, used by Mercado Pago to call us back.
     * Required only when MP is configured for an organization.
     */
    PUBLIC_API_URL: z.string().optional(),
    COOKIE_DOMAIN: z.string().optional(),
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
