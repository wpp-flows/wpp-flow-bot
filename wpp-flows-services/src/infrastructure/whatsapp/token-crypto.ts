import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from "node:crypto";
import { env } from "@/infrastructure/config/env";

/**
 * AES-256-GCM at-rest encryption for per-bot WhatsApp Cloud API access tokens.
 * Stored form is `v1:<ivB64>:<tagB64>:<cipherB64>`. The key comes from
 * WHATSAPP_TOKEN_ENC_KEY (base64, 32 bytes). Without a key we refuse to
 * encrypt/decrypt — tokens are sensitive enough that a silent plaintext
 * fallback would be worse than a hard failure.
 */

const PREFIX = "v1";

function getKey(): Buffer {
    const raw = env.WHATSAPP_TOKEN_ENC_KEY;
    if (!raw) {
        throw new Error(
            "WHATSAPP_TOKEN_ENC_KEY is not set — cannot encrypt/decrypt Cloud API tokens.",
        );
    }
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
        throw new Error(
            `WHATSAPP_TOKEN_ENC_KEY must decode to 32 bytes (got ${key.length}).`,
        );
    }
    return key;
}

export function encryptToken(plain: string): string {
    const key = getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
        PREFIX,
        iv.toString("base64"),
        tag.toString("base64"),
        enc.toString("base64"),
    ].join(":");
}

export function decryptToken(stored: string): string {
    const parts = stored.split(":");
    if (parts.length !== 4 || parts[0] !== PREFIX) {
        throw new Error("Malformed encrypted token.");
    }
    const key = getKey();
    const iv = Buffer.from(parts[1]!, "base64");
    const tag = Buffer.from(parts[2]!, "base64");
    const enc = Buffer.from(parts[3]!, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function isTokenCryptoConfigured(): boolean {
    return Boolean(env.WHATSAPP_TOKEN_ENC_KEY);
}
