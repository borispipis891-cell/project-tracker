import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { consumeToken, hashPassword } from "@/lib/auth-helpers";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Токен обязателен"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Неверный формат запроса" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const userId = await consumeToken(token, "PASSWORD_RESET");

    if (!userId) {
      return NextResponse.json(
        { error: "Недействительный или истекший токен" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    return NextResponse.json({
      message: "Пароль успешно изменён. Теперь вы можете войти с новым паролем."
    });
  } catch (error) {
    console.error('[RESET_PASSWORD] Error:', error);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
