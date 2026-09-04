import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { consumeToken } from "@/lib/auth-helpers";

const verifySchema = z.object({
  token: z.string().min(1, "Токен обязателен"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверный формат запроса" },
      { status: 400 }
    );
  }

  const userId = await consumeToken(parsed.data.token, "EMAIL_VERIFY");

  if (!userId) {
    return NextResponse.json(
      { error: "Недействительный или истекший токен" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });

  return NextResponse.json({ message: "Email успешно подтверждён. Теперь вы можете войти." });
}
