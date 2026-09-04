import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/auth-helpers";

const forgotPasswordSchema = z.object({
  email: z.string().email("Некорректный email"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректный email" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Не сообщаем существует ли пользователь (защита от перебора email)
    if (!user) {
      return NextResponse.json({
        message: "Если пользователь с таким email существует, мы отправили инструкции.",
      });
    }

    const { resetUrl } = await createPasswordResetToken(user.id);

    return NextResponse.json({
      message: "Инструкции отправлены на email.",
      resetUrl, // Временно возвращаем для разработки
    });
  } catch (error) {
    console.error('[FORGOT_PASSWORD] Error:', error);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
