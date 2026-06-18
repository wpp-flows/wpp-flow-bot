import { randomBytes } from "node:crypto";
import { getRedisClient } from "@/infrastructure/redis/client";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import type { ServiceType } from "@/modules/order/repositories/order-repo";
import type { ReportRepository } from "../repositories/report-repo";
import { GenerateDailyReportUseCase, spDateOf } from "./generate-daily-report";

const TICK_INTERVAL_MS = 15 * 60_000;
const LOCK_TTL_MS = 5 * 60_000;
const LOCK_KEY_PREFIX = "wpp-flows:daily-report:lock:";

const NODE_TOKEN = randomBytes(16).toString("hex");

const RELEASE_LOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

const SERVICE_TYPES: ServiceType[] = ["DELIVERY", "LOCAL"];

export class DailyReportScheduler {
    private handle: NodeJS.Timeout | null = null;
    private ticking = false;

    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly reportRepo: ReportRepository,
        private readonly generator: GenerateDailyReportUseCase,
    ) {}

    start(): void {
        if (this.handle) return;
        this.handle = setInterval(() => {
            void this.tick();
        }, TICK_INTERVAL_MS);
        this.handle.unref();
        console.log(
            `📊 DailyReportScheduler started (tick=${TICK_INTERVAL_MS / 1000}s, node=${NODE_TOKEN.slice(0, 8)}).`,
        );

        void this.tick();
    }

    stop(): void {
        if (this.handle) {
            clearInterval(this.handle);
            this.handle = null;
        }
    }

    /**
     * Walks back `daysBack` calendar days (in SP time) and materializes any
     * missing reports. Called once on boot so a fresh deploy of this module
     * fills in the recent history that pre-dates the Report table. Idempotent
     * — every per-row write goes through the same SETNX path as the daily
     * tick, so multiple nodes booting at once won't race.
     *
     * Runs to completion before returning, but the caller should usually
     * await it in the background (don't block the HTTP boot — a few hundred
     * orgs × 30 days = thousands of small queries).
     */
    async backfill(daysBack: number): Promise<void> {
        if (daysBack <= 0) return;
        try {
            const orgs = await this.orgRepo.listAll();

            for (let offset = daysBack; offset >= 1; offset -= 1) {
                const date = spDateOf(offset);
                for (const org of orgs) {
                    for (const serviceType of SERVICE_TYPES) {
                        await this.generateIfMissing(
                            org.id,
                            serviceType,
                            date,
                        ).catch((err) => {
                            console.warn(
                                `DailyReportScheduler backfill: ${org.id}/${serviceType}/${date} failed:`,
                                err,
                            );
                        });
                    }
                }
            }
            console.log(
                `📊 DailyReportScheduler backfill complete (${daysBack} days, ${orgs.length} orgs).`,
            );
        } catch (err) {
            console.error("DailyReportScheduler backfill failed:", err);
        }
    }

    private async tick(): Promise<void> {
        if (this.ticking) return;
        this.ticking = true;
        try {
            const yesterday = spDateOf(1);
            const orgs = await this.orgRepo.listAll();
            for (const org of orgs) {
                for (const serviceType of SERVICE_TYPES) {
                    await this.generateIfMissing(
                        org.id,
                        serviceType,
                        yesterday,
                    ).catch((err) => {
                        console.warn(
                            `DailyReportScheduler: ${org.id}/${serviceType}/${yesterday} failed:`,
                            err,
                        );
                    });
                }
            }
        } catch (err) {
            console.error("DailyReportScheduler tick failed:", err);
        } finally {
            this.ticking = false;
        }
    }

    private async generateIfMissing(
        organizationId: string,
        serviceType: ServiceType,
        date: string,
    ): Promise<void> {
        const existing = await this.reportRepo.findOne(
            organizationId,
            serviceType,
            date,
        );
        if (existing) return;

        const redis = getRedisClient();
        const key = `${LOCK_KEY_PREFIX}${organizationId}:${serviceType}:${date}`;
        const acquired = await redis.set(
            key,
            NODE_TOKEN,
            "PX",
            LOCK_TTL_MS,
            "NX",
        );
        if (acquired !== "OK") return;

        try {
            const fresh = await this.reportRepo.findOne(
                organizationId,
                serviceType,
                date,
            );
            if (fresh) return;

            await this.generator.execute({
                organizationId,
                serviceType,
                date,
            });
        } finally {
            try {
                await redis.eval(RELEASE_LOCK_LUA, 1, key, NODE_TOKEN);
            } catch (err) {
                console.warn(
                    `DailyReportScheduler: failed to release lock ${key}:`,
                    err,
                );
            }
        }
    }
}
