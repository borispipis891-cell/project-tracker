import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

const inviteSchema = z.object({
  email: z.string().email("Некорректный email"),
  role: z.enum(["editor", "viewer"], {
    errorMap: () => ({ message: "Роль должна быть editor или viewer" }),
  }),
  projectId: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Некорректные данные" },
        { status: 400 }
      );
    }

    const { email, role, projectId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Проверяем права доступа к проекту
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        ProjectMember: {
          where: { userId: currentUser.id },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    const member = project.ProjectMember[0];
    const isOwner = project.ownerId === currentUser.id;

    // Только владелец или редактор может приглашать
    if (!isOwner && member?.role !== "editor") {
      return NextResponse.json(
        { error: "Недостаточно прав для приглашения" },
        { status: 403 }
      );
    }

    // Проверяем существует ли пользователь
    const invitedUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (invitedUser) {
      // Пользователь уже зарегистрирован - добавляем напрямую
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: invitedUser.id,
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "Пользователь уже добавлен в проект" },
          { status: 409 }
        );
      }

      await prisma.projectMember.create({
        data: {
          projectId,
          userId: invitedUser.id,
          role,
        },
      });

      return NextResponse.json({
        message: "Пользователь добавлен в проект",
        user: {
          id: invitedUser.id,
          name: invitedUser.name,
          email: invitedUser.email,
          role,
        },
      });
    } else {
      // Пользователь не зарегистрирован - создаём приглашение
      const crypto = require("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней

      // Проверяем нет ли активного приглашения
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          email: normalizedEmail,
          projectId,
          status: "pending",
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: "Приглашение уже отправлено этому пользователю" },
          { status: 409 }
        );
      }

      const invitation = await prisma.invitation.create({
        data: {
          email: normalizedEmail,
          role,
          token,
          projectId,
          invitedBy: currentUser.id,
          expiresAt,
        },
      });

      const inviteUrl = `${process.env.APP_URL}/accept-invite?token=${token}`;
      console.log(`Invite link: ${inviteUrl}`);

      return NextResponse.json({
        message: "Приглашение отправлено",
        inviteUrl, // Временно возвращаем ссылку
      });
    }
  } catch (error) {
    console.error("[INVITE] Error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
