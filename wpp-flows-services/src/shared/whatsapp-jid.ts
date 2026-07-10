/**
 * Normalizes a stored conversation `remoteJid` into the phone/target a gateway
 * should send to. Conversations are stored as `<id>@s.whatsapp.net` (both
 * providers), so for normal chats we return the bare number; `@lid` sessions
 * keep the full JID since their digits aren't a real phone number. The Cloud
 * and Evolution gateways both strip non-digits before sending, so a bare number
 * works for either.
 */
export function jidToSendTarget(jid: string): string {
    if (/@lid$/.test(jid)) return jid;
    return jid.replace(/@.*$/, "");
}
