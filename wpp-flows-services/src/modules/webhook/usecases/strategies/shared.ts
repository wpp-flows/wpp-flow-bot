export interface EvolutionMessageKey {
    id: string;
    remoteJid: string;
    fromMe: boolean;
}

export interface EvolutionMessageContent {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
}

export interface EvolutionMessage {
    key: EvolutionMessageKey;
    pushName?: string;
    message?: EvolutionMessageContent;
    messageTimestamp?: number;
}

export interface EvolutionUpdate {
    keyId: string;
    status?: string;
}

export function extractText(msg: EvolutionMessage): string | null {
    return (
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        msg.message?.imageMessage?.caption ??
        msg.message?.videoMessage?.caption ??
        null
    );
}

export function parseMessages(data: unknown): EvolutionMessage[] {
    const d = data as { messages?: unknown; key?: unknown };
    if (Array.isArray(d?.messages)) return d.messages as EvolutionMessage[];
    if (d?.key) return [d as EvolutionMessage];
    return [];
}

export function parseUpdates(data: unknown): EvolutionUpdate[] {
    const d = data as { updates?: unknown };
    if (Array.isArray(d?.updates)) return d.updates as EvolutionUpdate[];
    if (Array.isArray(data)) return data as EvolutionUpdate[];
    return [data as EvolutionUpdate];
}

export function isPersonalJid(jid: string): boolean {
    // Skip groups (@g.us), broadcasts/status (@broadcast), newsletters (@newsletter),
    // linked-id sessions (@lid). Only handle 1:1 chats (@s.whatsapp.net or @c.us).
    return /@(s\.whatsapp\.net|c\.us)$/.test(jid);
}
