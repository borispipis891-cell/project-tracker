import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

const acceptSchema = z.object({
  token: z.string().min(1, "Токен обязателен"),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = acceptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Некорректные данные" },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Получаем приглашение
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Приглашение не найдено" },
        { status: 404 }
      );
    }

    // Проверяем срок действия
    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });

      return NextResponse.json(
        { error: "Срок действия приглашения истёк" },
        { status: 400 }
      );
    }

    // Проверяем статус
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Приглашение уже использовано" },
        { status: 400 }
      );
    }

    // Проверяем что email совпадает
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Приглашение отправлено на другой email" },
        { status: 403 }
      );
    }

    // Проверяем что projectId существует
    if (!invitation.projectId) {
      return NextResponse.json(
        { error: "Приглашение некорректно" },
        { status: 400 }
      );
    }

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Проверяем что пользователь ещё не добавлен
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId: invitation.projectId,
        userId: currentUser.id,
      },
    });

    if (existingMember) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      return NextResponse.json(
        { error: "Вы уже являетесь участником проекта" },
        { status: 409 }
      );
    }

    // Добавляем пользователя в проект
    await prisma.projectMember.create({
      data: {
        projectId: invitation.projectId,
        userId: currentUser.id,
        role: invitation.role,
      },
    });

    // Обновляем статус приглашения
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });

    // Получаем информацию о проекте
    const project = await prisma.project.findUnique({
      where: { id: invitation.projectId },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      message: "Приглашение принято",
      project,
    });
  } catch (error) {
    console.error("[ACCEPT_INVITE] Error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
