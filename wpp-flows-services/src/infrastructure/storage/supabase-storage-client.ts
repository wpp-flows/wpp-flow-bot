import { env } from "@/infrastructure/config/env";
import type {
    StorageClient,
    StorageUploadInput,
    StorageUploadResult,
} from "./storage-client";

export class SupabaseStorageClient implements StorageClient {
    constructor(
        private readonly supabaseUrl: string,
        private readonly serviceRoleKey: string,
        private readonly bucket: string,
    ) {}

    async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
        const url = this.objectUrl(input.key);
        const body = new Blob([input.body as BlobPart], {
            type: input.contentType,
        });
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.serviceRoleKey}`,
                "Content-Type": input.contentType,
                "x-upsert": "true",
            },
            body,
        });
        if (!res.ok) {
            const detail = await safeReadText(res);
            throw new Error(
                `Supabase storage upload failed (${res.status}): ${detail}`,
            );
        }
        return {
            key: input.key,
            publicUrl: this.publicUrl(input.key),
        };
    }

    async delete(key: string): Promise<void> {
        const url = this.objectUrl(key);
        try {
            const res = await fetch(url, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${this.serviceRoleKey}` },
            });
            if (!res.ok && res.status !== 404) {
                console.warn(
                    `Supabase storage delete failed (${res.status}) for key=${key}`,
                );
            }
        } catch (err) {
            console.warn(`Supabase storage delete threw for key=${key}:`, err);
        }
    }

    private objectUrl(key: string): string {
        return `${this.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${
            this.bucket
        }/${encodeKey(key)}`;
    }

    private publicUrl(key: string): string {
        return `${this.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${
            this.bucket
        }/${encodeKey(key)}`;
    }
}

function encodeKey(key: string): string {
    return key.split("/").map(encodeURIComponent).join("/");
}

async function safeReadText(res: Response): Promise<string> {
    try {
        return await res.text();
    } catch {
        return "<no body>";
    }
}

export function buildDefaultStorageClient(): StorageClient {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error(
            "Storage não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no env.",
        );
    }
    return new SupabaseStorageClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        env.SUPABASE_STORAGE_BUCKET,
    );
}
