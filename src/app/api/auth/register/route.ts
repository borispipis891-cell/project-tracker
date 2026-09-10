import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createEmailVerificationToken } from "@/lib/auth-helpers";
import { isAdminEmail } from "@/lib/admin";

const registerSchema = z
  .object({
    name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
    email: z.string().email("Некорректный email"),
    password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    console.log('[REGISTER] Starting registration...');

    const body = await request.json();
    console.log('[REGISTER] Body received:', { name: body.name, email: body.email });

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      console.log('[REGISTER] Validation failed:', parsed.error);
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Некорректные данные" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    console.log('[REGISTER] Normalized email:', normalizedEmail);

    console.log('[REGISTER] Checking if user exists...');
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      console.log('[REGISTER] User already exists');
      return NextResponse.json(
        { error: "Пользователь с таким email уже зарегистрирован" },
        { status: 409 }
      );
    }

    console.log('[REGISTER] Hashing password...');
    const passwordHash = await hashPassword(password);

    const isAdmin = isAdminEmail(normalizedEmail);

    console.log('[REGISTER] Creating user and verification token in transaction...');
    let userId: string;
    let verifyUrl: string | undefined;

    try {
      // Создаем пользователя и токен в одной транзакции
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email: normalizedEmail,
            password: passwordHash,
            emailVerified: false,
            isBlocked: false,
            role: isAdmin ? 'admin' : 'user',
            status: 'active',
            permissions: {},
          },
        });

        const token = await tx.verificationToken.create({
          data: {
            token: require('crypto').randomBytes(32).toString('hex'),
            type: 'EMAIL_VERIFY',
            userId: user.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        const APP_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const url = `${APP_URL}/verify-email?token=${token.token}`;

        return { user, token, verifyUrl: url };
      });

      userId = result.user.id;
      verifyUrl = result.verifyUrl;
      console.log('[REGISTER] User and token created:', userId, 'Role:', result.user.role);

      // Отправляем письмо ПОСЛЕ транзакции
      try {
        const { sendVerificationEmail } = await import('@/lib/email');
        await sendVerificationEmail(normalizedEmail, verifyUrl);
        console.log('[REGISTER] Verification email sent to:', normalizedEmail);
      } catch (emailError) {
        console.error('[REGISTER] Failed to send verification email:', emailError);
        // Не бросаем ошибку - пользователь создан, можно отправить письмо повторно
      }
    } catch (error) {
      console.error('[REGISTER] Transaction failed:', error);
      throw error;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const response: { message: string; verifyUrl?: string } = {
      message: isAdmin
        ? "Регистрация успешна! Вы назначены администратором. Проверьте email для подтверждения."
        : "Регистрация успешна! Проверьте email для подтверждения.",
    };

    // Возвращаем verifyUrl только в development
    if (isDevelopment && verifyUrl) {
      response.verifyUrl = verifyUrl;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[REGISTER] Error:', error);

    // Не возвращаем технические детали клиенту
    let errorMessage = "Не удалось зарегистрировать пользователя. Попробуйте позже.";

    // Только для известных ошибок показываем понятное сообщение
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        errorMessage = "Пользователь с таким email уже зарегистрирован";
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
