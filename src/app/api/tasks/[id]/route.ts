import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { syncProjectDeadline } from '@/lib/project-task-deadline';
import { sendCommentNotifications } from '@/lib/comment-notifications';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const body = await request.json();
    const taskId = parseInt(params.id);
    const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!oldTask) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });

    const deadlineChanged = body.deadline !== undefined && oldTask.deadline !== body.deadline;
    const deadlineChangeComment = String(body.deadlineChangeComment || '').trim();
    if (deadlineChanged && !deadlineChangeComment) {
      return NextResponse.json({ error: 'Укажите причину переноса дедлайна' }, { status: 400 });
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

    await syncProjectDeadline(task.projectId);

    if (deadlineChanged) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true },
      });
      if (currentUser) {
        const now = new Date().toISOString();
        await prisma.$transaction([
          prisma.comment.create({
            data: {
              author: currentUser.name || currentUser.email,
              text: deadlineChangeComment,
              date: now,
              userId: currentUser.id,
              taskId,
            },
          }),
          prisma.projectHistory.create({
            data: {
              projectId: task.projectId,
              date: now,
              user: currentUser.name || currentUser.email,
              userId: currentUser.id,
              action: 'Изменён дедлайн задачи',
              details: `«${task.title}»: ${oldTask.deadline} → ${task.deadline}. Причина: ${deadlineChangeComment}`,
            },
          }),
          prisma.projectHistory.create({
            data: {
              projectId: task.projectId,
              date: now,
              user: currentUser.name || currentUser.email,
              userId: currentUser.id,
              action: 'Добавлен комментарий',
              details: `Задача «${task.title}», причина переноса дедлайна: ${deadlineChangeComment}`,
            },
          }),
        ]);
        try {
          await sendCommentNotifications({
            projectId: task.projectId,
            taskId,
            text: deadlineChangeComment,
            authorName: currentUser.name || currentUser.email,
            authorEmail: currentUser.email,
          });
        } catch (emailError) {
          console.error('[DEADLINE_COMMENT_EMAIL] Failed:', emailError);
        }
      }
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
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id);

    await prisma.task.delete({
      where: { id: taskId },
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
