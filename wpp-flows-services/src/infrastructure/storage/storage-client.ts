
export interface StorageUploadInput {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
}

export interface StorageUploadResult {
    publicUrl: string;
    key: string;
}

export interface StorageClient {
    upload(input: StorageUploadInput): Promise<StorageUploadResult>;
    delete(key: string): Promise<void>;
}
