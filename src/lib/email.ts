import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
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
  projectInvite: (projectName: string, inviteUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Приглашение в проект</h2>
      <p>Вас пригласили присоединиться к проекту <strong>${projectName}</strong>.</p>
      <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Принять приглашение
      </a>
    </div>
  `,
  deadlineReminder: (taskTitle: string, deadline: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Напоминание о дедлайне</h2>
      <p>Задача <strong>${taskTitle}</strong> должна быть выполнена до <strong>${deadline}</strong>.</p>
    </div>
  `,
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
