import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

const APP_URL = process.env.APP_URL || "http://localhost:3000";

/**
 * Создаёт токен подтверждения email (TTL 24 часа)
 */
export async function createEmailVerificationToken(userId: string, userEmail: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: { token, type: "EMAIL_VERIFY", userId, expiresAt },
  });

  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  // Отправка email
  try {
    await sendVerificationEmail(userEmail, verifyUrl);
    console.log(`[AUTH] Verification email sent to: ${userEmail}`);
  } catch (error) {
    console.error('[AUTH] Failed to send verification email:', error);
    // Не бросаем ошибку, чтобы регистрация все равно прошла
  }

  return { token, verifyUrl };
}

/**
 * Создаёт токен сброса пароля (TTL 1 час)
 */
export async function createPasswordResetToken(userId: string, userEmail: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: { token, type: "PASSWORD_RESET", userId, expiresAt },
  });

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  // Отправка email
  try {
    await sendPasswordResetEmail(userEmail, resetUrl);
    console.log(`[AUTH] Password reset email sent to: ${userEmail}`);
  } catch (error) {
    console.error('[AUTH] Failed to send password reset email:', error);
    throw error; // Для сброса пароля бросаем ошибку
  }

  return { token, resetUrl };
}

/**
 * Проверяет и "погашает" одноразовый токен. Возвращает userId, если токен валиден.
 */
export async function consumeToken(token: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET") {
  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.verificationToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return record.userId;
}
