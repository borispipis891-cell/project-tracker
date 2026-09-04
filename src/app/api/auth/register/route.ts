import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createEmailVerificationToken } from "@/lib/auth-helpers";

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

    // Проверяем количество пользователей - первый становится админом
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    console.log('[REGISTER] Creating user...');
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: passwordHash,
        emailVerified: false,
        isBlocked: false,
        role: isFirstUser ? 'admin' : 'user',
        status: 'active',
        permissions: {},
      },
    });
    console.log('[REGISTER] User created:', user.id, 'Role:', user.role);

    // Create verification token
    console.log('[REGISTER] Creating verification token...');
    const { verifyUrl } = await createEmailVerificationToken(user.id);
    console.log('[REGISTER] Token created');

    return NextResponse.json({
      message: isFirstUser
        ? "Регистрация успешна! Вы назначены администратором."
        : "Регистрация успешна! Проверьте email для подтверждения.",
      verifyUrl,
    });
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    return NextResponse.json(
      { error: "Ошибка сервера: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
