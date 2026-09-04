import { emailLayout } from "./layout";

export function verifyEmailTemplate(name: string, verifyUrl: string) {
  return emailLayout(
    "Подтвердите ваш email",
    `
    <p>Здравствуйте, ${name}!</p>
    <p>Спасибо за регистрацию в Project Tracker. Чтобы завершить регистрацию, подтвердите ваш email по кнопке ниже:</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${verifyUrl}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Подтвердить email</a>
    </p>
    <p>Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.</p>
    `
  );
}
