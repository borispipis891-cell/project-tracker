import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getUserProjectRole } from '@/lib/project-permissions';

export async function PUT(
  request: Request,
  { params }: { params: { id: string; taskId: string } }
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
    const taskId = parseInt(params.taskId);

    // Check edit access
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canEdit) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();

    // Get old task data to detect changes
    const oldTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!oldTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: body.title,
        status: body.status,
        receivedAt: body.receivedAt,
        deadline: body.deadline,
        completedAt: body.completedAt,
        responsible: body.responsible,
        engineer: body.engineer,
        customFields: body.customFields,
      },
    });

    // Detect changes and create history entries
    const changes: string[] = [];

    if (oldTask.title !== body.title) {
      changes.push(`название с "${oldTask.title}" на "${body.title}"`);
    }
    if (oldTask.status !== body.status) {
      changes.push(`статус с "${oldTask.status}" на "${body.status}"`);
    }
    if (oldTask.deadline !== body.deadline) {
      changes.push(`дедлайн с "${oldTask.deadline}" на "${body.deadline}"`);
    }
    if (oldTask.responsible !== body.responsible) {
      changes.push(`ответственного с "${oldTask.responsible || '—'}" на "${body.responsible || '—'}"`);
    }
    if (oldTask.engineer !== body.engineer) {
      changes.push(`инженера с "${oldTask.engineer || '—'}" на "${body.engineer || '—'}"`);
    }

    if (changes.length > 0) {
      await prisma.projectHistory.create({
        data: {
          projectId,
          date: new Date().toISOString(),
          user: currentUser.name || currentUser.email,
          action: 'Изменена задача',
          details: `"${body.title}": ${changes.join(', ')}`,
        },
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; taskId: string } }
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
    const taskId = parseInt(params.taskId);

    // Check edit access
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canEdit) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    // Add history entry
    await prisma.projectHistory.create({
      data: {
        projectId,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        action: 'Удалена задача',
        details: `"${task.title}"`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
