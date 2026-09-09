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
    const t1 = Date.now();
    const session = await getServerSession(authOptions);
    console.log(`[Task Create] Session: ${Date.now() - t1}ms`);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const t2 = Date.now();
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    console.log(`[Task Create] Find user: ${Date.now() - t2}ms`);

    if (!currentUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const projectId = parseInt(params.id);

    // Check edit access
    const t3 = Date.now();
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    console.log(`[Task Create] Check permissions: ${Date.now() - t3}ms`);
    if (!permissions?.canEdit) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();

    const t4 = Date.now();
    const task = await prisma.task.create({
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
    });
    console.log(`[Task Create] Create task: ${Date.now() - t4}ms`);

    // Add history entry
    const t5 = Date.now();
    await prisma.projectHistory.create({
      data: {
        projectId,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        action: 'Добавлена задача',
        details: `"${body.title}"`,
      },
    });
    console.log(`[Task Create] Create history: ${Date.now() - t5}ms`);
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
