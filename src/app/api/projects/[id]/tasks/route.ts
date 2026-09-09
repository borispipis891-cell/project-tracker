import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getUserProjectRole } from '@/lib/project-permissions';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const projectId = parseInt(params.id);

    // Объединяем запросы: получаем пользователя и проверяем права одновременно
    const t1 = Date.now();
    const [currentUser, project] = await Promise.all([
      prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true },
      }),
      prisma.project.findUnique({
        where: { id: projectId },
        include: {
          ProjectMember: {
            where: { userId: { not: undefined } },
            select: { role: true, userId: true },
          },
        },
      }),
    ]);
    console.log(`[Task Create] Parallel fetch: ${Date.now() - t1}ms`);

    if (!currentUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Проверяем права локально, без дополнительного запроса
    const isOwner = project.ownerId === currentUser.id;
    const memberRole = project.ProjectMember.find(m => m.userId === currentUser.id)?.role;
    const canEdit = isOwner || memberRole === 'editor';

    if (!canEdit) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Создаём задачу и запись истории параллельно
    const t2 = Date.now();
    const [task] = await Promise.all([
      prisma.task.create({
        data: {
          projectId,
          title: body.title,
          description: body.description || '',
          status: body.status || 'not_started',
          priority: body.priority || 'medium',
          receivedAt: body.receivedAt || '',
          deadline: body.deadline || '',
          dueDate: body.dueDate || body.deadline || '',
          completedAt: body.completedAt,
          responsible: body.responsible,
          engineer: body.engineer,
          customFields: body.customFields || {},
        },
      }),
      prisma.projectHistory.create({
        data: {
          projectId,
          date: new Date().toISOString(),
          user: currentUser.name || currentUser.email,
          action: 'Добавлена задача',
          details: `"${body.title}"`,
        },
      }),
    ]);
    console.log(`[Task Create] Parallel create: ${Date.now() - t2}ms`);
    console.log(`[Task Create] Total: ${Date.now() - startTime}ms`);

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    console.log(`[Task Create] Failed after: ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const projectId = parseInt(params.id);

    // Check view access
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canView) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
