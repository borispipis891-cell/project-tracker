import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  } : undefined,
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  // Если SMTP не настроен, просто логируем
  if (!process.env.SMTP_HOST) {
    console.log('📧 Email (not sent, SMTP not configured):');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text || html}`);
    return { success: true, messageId: 'mock-id' };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Project Tracker <noreply@localhost>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    console.log('📧 Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
}

// Шаблоны писем
export const emailTemplates = {
  projectInvite: (data: {
    inviterName: string;
    projectName: string;
    role: string;
    projectUrl: string;
  }) => ({
    subject: `Вы приглашены в проект "${data.projectName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B6DFF;">Приглашение в проект</h2>
        <p><strong>${data.inviterName}</strong> пригласил вас в проект <strong>"${data.projectName}"</strong></p>
        <p>Ваша роль: <strong>${data.role === 'editor' ? 'Редактор' : 'Наблюдатель'}</strong></p>
        <a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background: #3B6DFF; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Открыть проект
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Если вы не ожидали это приглашение, просто проигнорируйте это письмо.
        </p>
      </div>
    `,
  }),

  deadlineReminder: (data: {
    projectName: string;
    deadline: string;
    daysLeft: number;
    projectUrl: string;
  }) => ({
    subject: `⏰ Приближается дедлайн проекта "${data.projectName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E9A568;">⏰ Напоминание о дедлайне</h2>
        <p>До завершения проекта <strong>"${data.projectName}"</strong> осталось <strong>${data.daysLeft} ${data.daysLeft === 1 ? 'день' : 'дня'}</strong></p>
        <p>Дедлайн: <strong>${data.deadline}</strong></p>
        <a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background: #E9A568; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Открыть проект
        </a>
      </div>
    `,
  }),

  projectUpdate: (data: {
    projectName: string;
    changes: string;
    updatedBy: string;
    projectUrl: string;
  }) => ({
    subject: `Обновление проекта "${data.projectName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B6DFF;">Проект обновлён</h2>
        <p><strong>${data.updatedBy}</strong> внёс изменения в проект <strong>"${data.projectName}"</strong></p>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 16px 0;">
          ${data.changes}
        </p>
        <a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background: #3B6DFF; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Открыть проект
        </a>
      </div>
    `,
  }),
};
