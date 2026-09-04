import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = parseInt(searchParams.get("projectId") || "0");

    if (!projectId) {
      return NextResponse.json({ error: "projectId обязателен" }, { status: 400 });
    }

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Проверяем доступ к проекту
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        ProjectMember: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    const isOwner = project.ownerId === currentUser.id;
    const isMember = project.ProjectMember.some(m => m.userId === currentUser.id);

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "Нет доступа к проекту" },
        { status: 403 }
      );
    }

    // Формируем список участников
    const members = project.ProjectMember.map(m => ({
      id: m.id,
      userId: m.User.id,
      name: m.User.name,
      email: m.User.email,
      avatar: m.User.avatar,
      role: m.role,
      addedAt: m.addedAt,
    }));

    return NextResponse.json({
      owner: project.User,
      members,
    });
  } catch (error) {
    console.error("[GET_MEMBERS] Error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId обязателен" }, { status: 400 });
    }

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Получаем участника
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        Project: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Участник не найден" }, { status: 404 });
    }

    // Проверяем права (только владелец может удалять)
    if (member.Project.ownerId !== currentUser.id) {
      return NextResponse.json(
        { error: "Только владелец может удалять участников" },
        { status: 403 }
      );
    }

    // Нельзя удалить самого себя
    if (member.userId === currentUser.id) {
      return NextResponse.json(
        { error: "Нельзя удалить себя из проекта" },
        { status: 400 }
      );
    }

    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ message: "Участник удалён из проекта" });
  } catch (error) {
    console.error("[DELETE_MEMBER] Error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: "memberId и role обязательны" },
        { status: 400 }
      );
    }

    if (!["editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Роль должна быть editor или viewer" },
        { status: 400 }
      );
    }

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Получаем участника
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        Project: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Участник не найден" }, { status: 404 });
    }

    // Проверяем права (только владелец может изменять роли)
    if (member.Project.ownerId !== currentUser.id) {
      return NextResponse.json(
        { error: "Только владелец может изменять роли" },
        { status: 403 }
      );
    }

    await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
    });

    return NextResponse.json({ message: "Роль обновлена" });
  } catch (error) {
    console.error("[UPDATE_MEMBER] Error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
