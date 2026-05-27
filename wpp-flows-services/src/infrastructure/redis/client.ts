import Redis, { type Redis as RedisClient } from "ioredis";
import { env } from "@/infrastructure/config/env";

let client: RedisClient | null = null;

export function getRedisClient(): RedisClient {
    if (client) return client;

    console.log("aaaaa: ", env.REDIS_URL);
    client = new Redis({
        host: "10.0.1.5",
        port: 6379,
        username: "default",
        password: "123",
        family: 4,
        maxRetriesPerRequest: 3,
        retryStrategy: (attempts) => Math.min(attempts * 100, 5000),
    });
    client.on("error", (err) => {
        console.error("Redis error:", err.message);
    });
    return client;
}
