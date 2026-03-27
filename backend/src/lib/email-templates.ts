import { sendEmail } from '../config/email.js';
import { config } from '../config/index.js';

// ─── Email Verification ────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const verifyUrl = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await sendEmail(to, 'SalvaDash — Verifica il tuo indirizzo email', `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0f; color: #ffffff; padding: 32px; border-radius: 16px;">
      <h1 style="font-family: 'Space Grotesk', sans-serif; color: #00d4a0; font-size: 24px; margin-bottom: 8px;">SalvaDash</h1>
      <p style="color: #94a3b8; margin-bottom: 24px;">Benvenuto/a, ${escapeHtml(name)}!</p>
      <p style="color: #e2e8f0; margin-bottom: 24px;">
        Clicca il pulsante qui sotto per verificare il tuo indirizzo email e attivare il tuo account.
      </p>
      <a href="${verifyUrl}" style="display: inline-block; background: #00d4a0; color: #0a0a0f; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
        Verifica Email
      </a>
      <p style="color: #64748b; font-size: 12px; margin-top: 32px;">
        Se non hai creato un account su SalvaDash, puoi ignorare questa email.
      </p>
      <p style="color: #64748b; font-size: 12px;">
        Link diretto: <a href="${verifyUrl}" style="color: #4d9fff;">${verifyUrl}</a>
      </p>
    </div>
  `);
}

// ─── Password Reset ────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail(to, 'SalvaDash — Reset Password', `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0f; color: #ffffff; padding: 32px; border-radius: 16px;">
      <h1 style="font-family: 'Space Grotesk', sans-serif; color: #00d4a0; font-size: 24px; margin-bottom: 8px;">SalvaDash</h1>
      <p style="color: #94a3b8; margin-bottom: 24px;">Ciao ${escapeHtml(name)},</p>
      <p style="color: #e2e8f0; margin-bottom: 24px;">
        Hai richiesto il reset della password. Clicca il pulsante per impostare una nuova password.
      </p>
      <a href="${resetUrl}" style="display: inline-block; background: #00d4a0; color: #0a0a0f; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
        Reset Password
      </a>
      <p style="color: #ff4567; font-size: 13px; margin-top: 24px;">
        Questo link scade tra 1 ora.
      </p>
      <p style="color: #64748b; font-size: 12px; margin-top: 16px;">
        Se non hai richiesto il reset, puoi ignorare questa email.
      </p>
    </div>
  `);
}

// ─── Helpers ────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
