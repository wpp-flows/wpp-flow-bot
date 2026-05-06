import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.coerce.number().default(8080),
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.url()
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