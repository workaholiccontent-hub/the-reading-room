// Shared email utility for all edge functions
// Uses Resend (https://resend.com) - free tier: 3,000 emails/month

export const RESEND_API = 'https://api.resend.com/emails'

export async function sendEmail({ to, subject, html, from }) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || `The Reading Room <${Deno.env.get('FROM_EMAIL') || 'hello@thereadingroom.com'}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error ${res.status}: ${err}`)
  }

  return res.json()
}

// ── Email HTML templates ────────────────────────────────────────────────────

export function baseTemplate({ title, preheader, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <meta name="x-apple-disable-message-reformatting"/>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f2ece0;font-family:'Georgia',serif;">
  <span style="display:none;font-size:1px;color:#f2ece0;max-height:0;overflow:hidden;">${preheader || title}</span>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2ece0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:20px 32px;background:#1a1612;border-radius:14px 14px 0 0;">
                    <p style="margin:0;font-family:'Georgia',serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#c9a84c;">The</p>
                    <p style="margin:4px 0 0;font-family:'Georgia',serif;font-size:22px;font-weight:700;color:#faf7f2;">${Deno.env.get('LIBRARY_NAME') || 'The Reading Room'}</p>
                  </td>
                </tr>
                <!-- Body card -->
                <tr>
                  <td style="background:#faf7f2;padding:32px;border-radius:0 0 14px 14px;border:1px solid #e8dfd0;border-top:none;">
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 0 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#7a6f68;line-height:1.6;">
                You received this because you're a member of ${Deno.env.get('LIBRARY_NAME') || 'The Reading Room'}.<br/>
                Questions? Reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function button(text, url) {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
    <tr>
      <td style="background:#1a1612;border-radius:24px;padding:12px 28px;">
        <a href="${url}" style="font-family:sans-serif;font-size:14px;font-weight:500;color:#faf7f2;text-decoration:none;letter-spacing:0.01em;">${text}</a>
      </td>
    </tr>
  </table>`
}

export function bookRow(title, author, extraHtml = '') {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:16px 0;background:#f2ece0;border-radius:10px;overflow:hidden;">
    <tr>
      <td style="padding:14px 16px;border-left:3px solid #c9a84c;">
        <p style="margin:0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#1a1612;">${title}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#7a6f68;font-family:sans-serif;">by ${author}</p>
        ${extraHtml}
      </td>
    </tr>
  </table>`
}

export function divider() {
  return `<hr style="border:none;border-top:1px solid #e8dfd0;margin:24px 0;"/>`
}

export function h1(text) {
  return `<h1 style="margin:0 0 16px;font-family:'Georgia',serif;font-size:26px;font-weight:800;color:#1a1612;line-height:1.2;">${text}</h1>`
}

export function h2(text) {
  return `<h2 style="margin:0 0 12px;font-family:'Georgia',serif;font-size:18px;font-weight:700;color:#1a1612;">${text}</h2>`
}

export function p(text, muted = false) {
  return `<p style="margin:0 0 12px;font-size:15px;color:${muted ? '#7a6f68' : '#3d3530'};font-family:sans-serif;line-height:1.65;">${text}</p>`
}

export function badge(text, type = 'default') {
  const colors = {
    default:  { bg: '#e8dfd0', color: '#7a6f68' },
    warning:  { bg: 'rgba(201,168,76,0.15)', color: '#9a7a2e' },
    danger:   { bg: 'rgba(184,92,56,0.1)',   color: '#b85c38' },
    success:  { bg: 'rgba(90,122,106,0.1)',  color: '#5a7a6a' },
  }
  const c = colors[type] || colors.default
  return `<span style="display:inline-block;background:${c.bg};color:${c.color};font-size:11px;font-weight:500;font-family:sans-serif;padding:3px 10px;border-radius:20px;letter-spacing:0.03em;">${text}</span>`
}
