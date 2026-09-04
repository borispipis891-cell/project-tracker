import { emailLayout } from "./layout";

export function passwordResetTemplate(name: string, resetUrl: string) {
  return emailLayout(
    "Восстановление пароля",
    `
    <p>Здравствуйте, ${name}!</p>
    <p>Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы задать новый пароль:</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Сбросить пароль</a>
    </p>
    <p>Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо, пароль останется прежним.</p>
    `
  );
}
