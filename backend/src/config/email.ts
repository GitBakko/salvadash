import nodemailer from 'nodemailer';
import { config } from './index.js';

export const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transporter.sendMail({
    from: `"${config.smtp.fromName}" <${config.smtp.from}>`,
    to,
    subject,
    html,
  });
}
