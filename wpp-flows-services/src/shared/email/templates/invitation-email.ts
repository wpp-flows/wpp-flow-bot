import { env } from "@/infrastructure/config/env";

interface InvitationEmailInput {
    inviterName: string;
    inviteeEmail: string;
    token: string;
    expiresAt: Date;
}

export function buildInvitationEmail(input: InvitationEmailInput): {
    subject: string;
    html: string;
} {
    const clientOrigin = (env.CLIENT_ORIGIN ?? "").replace(/\/$/, "");
    const link = `${clientOrigin}/sign-up?token=${encodeURIComponent(input.token)}`;
    const expiresLabel = input.expiresAt.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const subject = `${input.inviterName} convidou você para o Conecta IA`;

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Conecta IA</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 0 40px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:600;color:#0f172a;">Você foi convidado(a) para o Conecta IA</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 0 40px;">
              <p style="margin:0;font-size:15px;line-height:1.55;color:#334155;">
                <strong style="color:#0f172a;">${escapeHtml(input.inviterName)}</strong> convidou você para criar uma conta no Conecta IA usando o e-mail
                <strong style="color:#0f172a;">${escapeHtml(input.inviteeEmail)}</strong>. Toque no botão abaixo para definir sua senha e começar.
              </p>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding:28px 40px 0 40px;">
              <a href="${escapeAttr(link)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 22px;border-radius:8px;">
                Aceitar convite
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">
                Ou cole este endereço no navegador:<br />
                <span style="word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#0f172a;">${escapeHtml(link)}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">
                Este convite expira em <strong style="color:#0f172a;">${escapeHtml(expiresLabel)}</strong> (horário de Brasília). Se você não esperava receber este e-mail, pode ignorar.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 32px 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px 0;" />
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">
                Conecta IA · plataforma de chatbot de WhatsApp para restaurantes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { subject, html };
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttr(value: string): string {
    return escapeHtml(value);
}
