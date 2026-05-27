import { buildDefaultStorageClient } from "./supabase-storage-client";
import type { StorageClient } from "./storage-client";

let cached: StorageClient | null = null;

export const storageClient: StorageClient = {
    upload(input) {
        cached ??= buildDefaultStorageClient();
        return cached.upload(input);
    },
    delete(key) {
        cached ??= buildDefaultStorageClient();
        return cached.delete(key);
    },
};
