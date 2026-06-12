import 'dotenv/config'
import { app } from './app'
import { env } from '@/infrastructure/config/env'
import { botMonitor } from '@/modules/bot/usecases/factories'

const PORT = env.PORT

await app.listen({
    port: PORT,
    host: '0.0.0.0',
})
console.log(`🚀 HTTP Server Running on port ${PORT}.`)
botMonitor.start()