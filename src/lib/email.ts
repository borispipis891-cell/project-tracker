import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Общая функция отправки email
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Email sent to:', options.to);
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {
  projectInvite: (data: {
    projectName: string;
    inviteUrl?: string;
    inviterName?: string;
    role?: string;
    projectUrl?: string;
  }) => ({
    subject: `Приглашение в проект ${data.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Приглашение в проект</h2>
        ${data.inviterName ? `<p><strong>${data.inviterName}</strong> пригласил вас присоединиться к проекту <strong>${data.projectName}</strong>.</p>` : `<p>Вас пригласили присоединиться к проекту <strong>${data.projectName}</strong>.</p>`}
        ${data.role ? `<p>Ваша роль: <strong>${data.role}</strong></p>` : ''}
        ${data.inviteUrl ? `<a href="${data.inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Принять приглашение</a>` : ''}
        ${data.projectUrl ? `<a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Открыть проект</a>` : ''}
      </div>
    `,
  }),
  deadlineReminder: (data: { projectName: string; deadline: string; daysLeft?: number; projectUrl?: string }) => ({
    subject: `Напоминание о дедлайне - ${data.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Напоминание о дедлайне</h2>
        <p>Проект <strong>${data.projectName}</strong> должен быть завершен до <strong>${data.deadline}</strong>.</p>
        ${data.daysLeft ? `<p>Осталось дней: <strong>${data.daysLeft}</strong></p>` : ''}
        ${data.projectUrl ? `<a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Открыть проект</a>` : ''}
      </div>
    `,
  }),
  projectUpdate: (data: { projectName: string; changes: string; updatedBy: string; projectUrl?: string }) => ({
    subject: `Обновление проекта - ${data.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Проект обновлен</h2>
        <p><strong>${data.updatedBy}</strong> внес изменения в проект <strong>${data.projectName}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
          ${data.changes}
        </div>
        ${data.projectUrl ? `<a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Открыть проект</a>` : ''}
      </div>
    `,
  }),
  projectAssignment: (data: { projectName: string; deadline?: string; assignedBy: string; projectUrl?: string }) => ({
    subject: `Вы назначены ответственным — ${data.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Вы назначены ответственным за проект</h2>
        <p><strong>${data.assignedBy}</strong> назначил вас ответственным за проект <strong>${data.projectName}</strong>.</p>
        ${data.deadline ? `<p>Дедлайн: <strong>${data.deadline}</strong></p>` : ''}
        ${data.projectUrl ? `<a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Открыть проект</a>` : ''}
      </div>
    `,
  }),
  taskAssignment: (data: { projectName: string; taskTitle: string; deadline?: string; assignedBy: string; projectUrl?: string }) => ({
    subject: `Вы назначены ответственным — ${data.taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Вы назначены ответственным за задачу</h2>
        <p><strong>${data.assignedBy}</strong> назначил вас ответственным за задачу <strong>${data.taskTitle}</strong>.</p>
        <p>Проект: <strong>${data.projectName}</strong></p>
        ${data.deadline ? `<p>Дедлайн: <strong>${data.deadline}</strong></p>` : ''}
        ${data.projectUrl ? `<a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Открыть проект</a>` : ''}
      </div>
    `,
  }),
  taskUpdate: (data: { projectName: string; taskTitle: string; changes: string; updatedBy: string; projectUrl?: string }) => ({
    subject: `Изменение задачи — ${data.taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Задача обновлена</h2>
        <p><strong>${data.updatedBy}</strong> изменил задачу <strong>${data.taskTitle}</strong> в проекте <strong>${data.projectName}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">${data.changes}</div>
        ${data.projectUrl ? `<a href="${data.projectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Открыть проект</a>` : ''}
      </div>
    `,
  }),
};

export async function sendVerificationEmail(email: string, verifyUrl: string) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Подтверждение email - Project Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Подтверждение email</h2>
        <p>Спасибо за регистрацию в Project Tracker!</p>
        <p>Пожалуйста, подтвердите ваш email, нажав на кнопку ниже:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Подтвердить email
        </a>
        <p>Или скопируйте эту ссылку в браузер:</p>
        <p style="color: #666; word-break: break-all;">${verifyUrl}</p>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Ссылка действительна в течение 24 часов.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Verification email sent to:', email);
  } catch (error) {
    console.error('[EMAIL] Failed to send verification email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Сброс пароля - Project Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Сброс пароля</h2>
        <p>Вы запросили сброс пароля для вашего аккаунта в Project Tracker.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Сбросить пароль
        </a>
        <p>Или скопируйте эту ссылку в браузер:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Ссылка действительна в течение 1 часа.<br>
          Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Password reset email sent to:', email);
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    throw error;
  }
}
