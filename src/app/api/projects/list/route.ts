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

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Получаем проекты где пользователь владелец или участник
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: currentUser.id },
          {
            ProjectMember: {
              some: {
                userId: currentUser.id,
              },
            },
          },
        ],
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ProjectMember: {
          where: {
            userId: currentUser.id,
          },
          select: {
            role: true,
          },
        },
        Task: {
          orderBy: { createdAt: 'desc' },
        },
        Comment: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        Attachment: {
          orderBy: { createdAt: 'desc' },
        },
        ProjectHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Добавляем информацию о роли пользователя в каждом проекте
    const projectsWithRole = projects.map((project) => {
      const isOwner = project.ownerId === currentUser.id;
      const memberRole = project.ProjectMember[0]?.role;

      return {
        ...project,
        owner: project.User, // Add owner alias for frontend compatibility
        tasks: project.Task, // Add tasks alias
        comments: project.Comment, // Add comments alias
        attachments: project.Attachment, // Add attachments alias
        history: project.ProjectHistory, // Add history alias
        members: project.ProjectMember, // Add members alias
        userRole: isOwner ? 'owner' : memberRole,
        canEdit: isOwner || memberRole === 'editor',
        canDelete: isOwner,
        canInvite: isOwner || memberRole === 'editor',
      };
    });

    return NextResponse.json({ projects: projectsWithRole });
  } catch (error) {
    console.error("[GET_PROJECTS] Error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
