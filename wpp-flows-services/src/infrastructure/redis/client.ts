import Redis, { type Redis as RedisClient } from "ioredis";
import { env } from "@/infrastructure/config/env";

let client: RedisClient | null = null;

export function getRedisClient(): RedisClient {
    if (client) return client;

    client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (attempts) => Math.min(attempts * 100, 5000),
    });
    client.on("error", (err) => {
        console.error("Redis error:", err.message);
    });
    return client;
}
