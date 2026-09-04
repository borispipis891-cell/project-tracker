import nodemailer from "nodemailer";

// Транспорт создаётся один раз и переиспользуется.
// Все параметры берутся ИСКЛЮЧИТЕЛЬНО из переменных окружения (.env).
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    // Если SMTP не настроен — не роняем приложение, но громко предупреждаем.
    // Это позволяет разрабатывать остальной функционал без готового почтового сервиса.
    console.warn(
      "[email] SMTP не настроен (SMTP_HOST/SMTP_USER/SMTP_PASSWORD отсутствуют в .env). " +
        "Письма не будут отправлены, только залогированы в консоль."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const from = process.env.EMAIL_FROM || "Project Tracker <no-reply@example.com>";

  if (!process.env.SMTP_HOST) {
    // SMTP не настроен: логируем вместо реальной отправки, чтобы разработка не блокировалась.
    console.log(`[email:DRY-RUN] To: ${to} | Subject: ${subject}`);
    return { dryRun: true };
  }

  const info = await getTransporter().sendMail({ from, to, subject, html });
  return { messageId: info.messageId };
}
