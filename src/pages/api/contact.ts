import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const prerender = false;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const data = await request.formData();

    // Honeypot: bots fill this, humans don't
    if (data.get('_honey')) return json({ ok: true }, 200);

    const name         = (data.get('name')         ?? '').toString().trim();
    const email        = (data.get('email')        ?? '').toString().trim();
    const organization = (data.get('organization') ?? '').toString().trim();
    const subject      = (data.get('subject')      ?? '').toString().trim();
    const message      = (data.get('message')      ?? '').toString().trim();

    if (!name || !email || !subject || !message) {
      return json({ ok: false, error: 'All required fields must be filled in.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: 'Enter a valid email address.' }, 400);
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = import.meta.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error('Contact: SMTP env vars not set (SMTP_HOST, SMTP_USER, SMTP_PASS).');
      return json({ ok: false, error: 'Contact form is not yet configured. Email kevin@jochannilabs.com directly.' }, 503);
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const text = [
      `Name: ${name}`,
      organization ? `Organization: ${organization}` : null,
      `Email: ${email}`,
      `Subject: ${subject}`,
      '',
      message,
    ].filter(Boolean).join('\n');

    const html = `
      <p><strong>Name:</strong> ${esc(name)}</p>
      ${organization ? `<p><strong>Organization:</strong> ${esc(organization)}</p>` : ''}
      <p><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
      <p><strong>Subject:</strong> ${esc(subject)}</p>
      <hr>
      <p style="white-space:pre-wrap">${esc(message)}</p>
    `;

    await transporter.sendMail({
      from: `"DAL-X Contact Form" <${SMTP_USER}>`,
      replyTo: `"${name}" <${email}>`,
      to: 'kevin@jochannilabs.com',
      subject: `[DAL-X] ${subject} — ${name}`,
      text,
      html,
    });

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('Contact form error:', err);
    return json({ ok: false, error: 'Message failed to send. Try again or email kevin@jochannilabs.com directly.' }, 500);
  }
};
