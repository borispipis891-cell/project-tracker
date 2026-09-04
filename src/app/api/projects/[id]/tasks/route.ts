import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getUserProjectRole } from '@/lib/project-permissions';

export async function POST(
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

    // Check edit access
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canEdit) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();

    const task = await prisma.task.create({
      data: {
        projectId,
        title: body.title,
        status: body.status || 'not_started',
        receivedAt: body.receivedAt,
        deadline: body.deadline,
        completedAt: body.completedAt,
        responsible: body.responsible,
        engineer: body.engineer,
        customFields: body.customFields || {},
      },
    });

    // Add history entry
    await prisma.projectHistory.create({
      data: {
        projectId,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        action: 'Добавлена задача',
        details: `"${body.title}"`,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
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
