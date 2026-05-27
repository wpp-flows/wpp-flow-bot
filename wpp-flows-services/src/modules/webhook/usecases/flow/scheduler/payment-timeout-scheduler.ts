import { getRedisClient } from "@/infrastructure/redis/client";

/**
 * Persistent payment-timeout scheduler.
 *
 * State lives in Redis so timers survive process restarts and deploys. Two
 * keys are used together:
 *   - ZSET `wpp-flows:payment-timeouts` — members are orderIds, score is the
 *     epoch-ms when the timeout should fire.
 *   - HASH `wpp-flows:payment-timeouts:meta` — orderId → JSON payload with
 *     the minimum context the handler needs (organizationId, orderId).
 *
 * On `schedule()` both entries are upserted (re-scheduling the same orderId
 * replaces the prior entry — same idempotency contract as the old in-memory
 * version). On `clear()` both are removed. A background poller in `start()`
 * scans every {@link POLL_INTERVAL_MS} for due members, atomically claims
 * them via ZREM, and invokes the registered handler.
 *
 * The handler is set ONCE at boot via {@link setHandler} — registering it
 * declaratively rather than passing a closure per `schedule()` call is what
 * makes this Redis-portable. The closure couldn't be serialized; the payload
 * can. Multi-instance safe: ZREM acts as the atomic claim, so only one worker
 * runs each due job.
 */
export interface PaymentTimeoutPayload {
    organizationId: string;
    orderId: string;
}

type PaymentTimeoutHandler = (payload: PaymentTimeoutPayload) => Promise<void>;

const ZSET_KEY = "wpp-flows:payment-timeouts";
const META_KEY = "wpp-flows:payment-timeouts:meta";
const POLL_INTERVAL_MS = 5_000;

class PaymentTimeoutScheduler {
    private handler: PaymentTimeoutHandler | null = null;
    private pollHandle: NodeJS.Timeout | null = null;
    private draining = false;

    setHandler(handler: PaymentTimeoutHandler): void {
        this.handler = handler;
    }

    /**
     * Schedules (or re-schedules) a timeout for `payload.orderId`. Calling
     * with the same orderId replaces any existing timer.
     */
    async schedule(payload: PaymentTimeoutPayload, delayMs: number): Promise<void> {
        const redis = getRedisClient();
        const fireAt = Date.now() + delayMs;
        await redis
            .multi()
            .zadd(ZSET_KEY, fireAt, payload.orderId)
            .hset(META_KEY, payload.orderId, JSON.stringify(payload))
            .exec();
    }

    async clear(orderId: string): Promise<void> {
        const redis = getRedisClient();
        await redis
            .multi()
            .zrem(ZSET_KEY, orderId)
            .hdel(META_KEY, orderId)
            .exec();
    }

    /** starts the poll loop. Safe to call once at boot — idempotent. */
    start(): void {
        if (this.pollHandle) return;
        this.pollHandle = setInterval(() => {
            void this.drain();
        }, POLL_INTERVAL_MS);
        // don't keep the event loop alive just for this.
        this.pollHandle.unref();
    }

    stop(): void {
        if (this.pollHandle) {
            clearInterval(this.pollHandle);
            this.pollHandle = null;
        }
    }

    private async drain(): Promise<void> {
        if (!this.handler || this.draining) return;
        this.draining = true;
        try {
            const redis = getRedisClient();
            const now = Date.now();
            const due = await redis.zrangebyscore(ZSET_KEY, 0, now, "LIMIT", 0, 50);
            for (const orderId of due) {
                // ZREM is the atomic claim — if another worker beats us to it,
                // the count comes back as 0 and we skip the job.
                const claimed = await redis.zrem(ZSET_KEY, orderId);
                if (claimed === 0) continue;

                const raw = await redis.hget(META_KEY, orderId);
                await redis.hdel(META_KEY, orderId);
                if (!raw) continue;

                let payload: PaymentTimeoutPayload;
                try {
                    payload = JSON.parse(raw) as PaymentTimeoutPayload;
                } catch {
                    console.warn(
                        `payment-timeout: malformed payload for order ${orderId}, skipping`,
                    );
                    continue;
                }

                try {
                    await this.handler(payload);
                } catch (err) {
                    console.error(
                        `Payment timeout handler failed for order ${orderId}:`,
                        err,
                    );
                }
            }
        } catch (err) {
            console.error("Payment timeout drain failed:", err);
        } finally {
            this.draining = false;
        }
    }
}

export const paymentTimeoutScheduler = new PaymentTimeoutScheduler();
