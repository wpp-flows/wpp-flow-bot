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
    documentMessage?: { caption?: string };
    documentWithCaptionMessage?: {
        message?: { documentMessage?: { caption?: string } };
    };
    buttonsResponseMessage?: { selectedDisplayText?: string };
    templateButtonReplyMessage?: { selectedDisplayText?: string };
    listResponseMessage?: { title?: string; singleSelectReply?: { selectedRowId?: string } };
    ephemeralMessage?: { message?: EvolutionMessageContent };
    viewOnceMessage?: { message?: EvolutionMessageContent };
    viewOnceMessageV2?: { message?: EvolutionMessageContent };
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
    return extractFromContent(msg.message);
}

function extractFromContent(
    content: EvolutionMessageContent | undefined
): string | null {
    if (!content) return null;
    return (
        content.conversation ??
        content.extendedTextMessage?.text ??
        content.imageMessage?.caption ??
        content.videoMessage?.caption ??
        content.documentMessage?.caption ??
        content.documentWithCaptionMessage?.message?.documentMessage?.caption ??
        content.buttonsResponseMessage?.selectedDisplayText ??
        content.templateButtonReplyMessage?.selectedDisplayText ??
        content.listResponseMessage?.title ??
        content.listResponseMessage?.singleSelectReply?.selectedRowId ??
        extractFromContent(content.ephemeralMessage?.message) ??
        extractFromContent(content.viewOnceMessage?.message) ??
        extractFromContent(content.viewOnceMessageV2?.message) ??
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
    // Accept 1:1 chats: classic (@s.whatsapp.net, @c.us) AND linked-id sessions (@lid),
    // which modern WhatsApp accounts use. Skip groups (@g.us), broadcasts (@broadcast),
    // newsletters (@newsletter), status (@status).
    return /@(s\.whatsapp\.net|c\.us|lid)$/.test(jid);
}

/**
 * Returns the destination Evolution should send to. For lid jids we keep the full JID
 * (the digits are NOT a real phone number); for classic jids we return the bare number.
 */
export function jidToSendTarget(jid: string): string {
    if (/@lid$/.test(jid)) return jid;
    return jid.replace(/@.*$/, "");
}
