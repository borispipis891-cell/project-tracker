import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

const resendSchema = z.object({
  email: z.string().email("Некорректный email"),
});

// Простая защита от спама - хранение последних запросов
const recentRequests = new Map<string, number>();
const RATE_LIMIT_MS = 60000; // 1 минута между запросами

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Некорректные данные" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Проверка rate limit
    const lastRequest = recentRequests.get(normalizedEmail);
    if (lastRequest && Date.now() - lastRequest < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: "Слишком частые запросы. Подождите минуту." },
        { status: 429 }
      );
    }

    // Обновляем время последнего запроса
    recentRequests.set(normalizedEmail, Date.now());

    // Ищем пользователя (безопасно - не раскрываем существование email)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Всегда возвращаем успех, чтобы не раскрывать существование email
    const successResponse = NextResponse.json({
      message: "Если пользователь с таким email существует и не подтвержден, письмо будет отправлено.",
    });

    if (!user) {
      console.log('[RESEND] User not found:', normalizedEmail);
      return successResponse;
    }

    if (user.emailVerified) {
      console.log('[RESEND] Email already verified:', normalizedEmail);
      return successResponse;
    }

    // Создаем новый токен в транзакции
    await prisma.$transaction(async (tx) => {
      // Помечаем старые неиспользованные токены как использованные
      await tx.verificationToken.updateMany({
        where: {
          userId: user.id,
          type: 'EMAIL_VERIFY',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      // Создаем новый токен
      const token = await tx.verificationToken.create({
        data: {
          token: crypto.randomBytes(32).toString('hex'),
          type: 'EMAIL_VERIFY',
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const APP_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verifyUrl = `${APP_URL}/verify-email?token=${token.token}`;

      // Отправляем письмо после транзакции
      try {
        await sendVerificationEmail(normalizedEmail, verifyUrl);
        console.log('[RESEND] Verification email sent to:', normalizedEmail);
      } catch (emailError) {
        console.error('[RESEND] Failed to send verification email:', emailError);
        throw new Error('Email sending failed');
      }
    });

    return successResponse;
  } catch (error) {
    console.error('[RESEND] Error:', error);
    return NextResponse.json(
      { error: "Не удалось отправить письмо. Попробуйте позже." },
      { status: 500 }
    );
  }
}
