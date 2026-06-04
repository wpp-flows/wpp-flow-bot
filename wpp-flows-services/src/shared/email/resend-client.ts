import { Resend } from "resend";
import { env } from "@/infrastructure/config/env";

/**
 * Lazy Resend client. Initialised on first use so a missing API key in dev
 * doesn't crash the boot, and so unit tests can substitute the env at will.
 */
let cached: Resend | null = null;
function getResend(): Resend {
    if (!cached) {
        if (!env.RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not configured");
        }
        cached = new Resend(env.RESEND_API_KEY);
    }
    return cached;
}

export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
}

/**
 * Sends an email via Resend, or logs it to the console when no API key is
 * configured. The dev-mode log includes a "MAIL →" prefix and the rendered
 * HTML so the invite link is visible during local testing without needing
 * an actual mail account.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
    if (!env.RESEND_API_KEY) {
        console.log(
            `MAIL → (no RESEND_API_KEY; not sent) to=${message.to} subject="${message.subject}"`,
        );
        console.log(message.html);
        return;
    }
    const { error } = await getResend().emails.send({
        from: env.INVITE_FROM_EMAIL,
        to: message.to,
        subject: message.subject,
        html: message.html,
    });
    if (error) {
        // Surface the Resend error message but don't leak the API key shape.
        throw new Error(`Resend send failed: ${error.message ?? "unknown"}`);
    }
}
