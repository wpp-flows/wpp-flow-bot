import 'dotenv/config'
import { app } from './app'
import { env } from '@/infrastructure/config/env'
import { botMonitor } from '@/modules/bot/usecases/factories'
import { dailyReportScheduler } from '@/modules/reports/usecases/factories'

const PORT = env.PORT

await app.listen({
    port: PORT,
    host: '0.0.0.0',
})
console.log(`🚀 HTTP Server Running on port ${PORT}.`)
botMonitor.start()
dailyReportScheduler.start()

// depois comentar, é só para popular relatórios antigos.
// está comentado pq ja foi corrigido os relatórios antigos, então não tem mais necessidade de rodar isso.
// void dailyReportScheduler.backfill(30, { force: true })