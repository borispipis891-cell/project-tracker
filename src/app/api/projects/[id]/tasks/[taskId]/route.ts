import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getUserProjectRole } from '@/lib/project-permissions';
import { emailTemplates, sendEmail } from '@/lib/email';

const appUrl = () => process.env.APP_URL || process.env.NEXTAUTH_URL || '';

const responsibleUserIdFrom = (customFields: unknown) => {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return null;
  const value = (customFields as Record<string, unknown>).__responsibleUserId;
  return typeof value === 'string' && value ? value : null;
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

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

    if (oldTask.projectId !== projectId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: body.title ?? oldTask.title,
        description: body.description ?? oldTask.description,
        status: body.status ?? oldTask.status,
        priority: body.priority ?? oldTask.priority,
        receivedAt: body.receivedAt ?? oldTask.receivedAt,
        deadline: body.deadline ?? oldTask.deadline,
        dueDate: body.dueDate ?? body.deadline ?? oldTask.dueDate,
        completedAt: body.completedAt || null,
        responsible: body.responsible || null,
        engineer: body.engineer || null,
        customFields: body.customFields ?? oldTask.customFields,
      },
    });

    // Detect changes and create history entries
    const changes: string[] = [];

    if (oldTask.title !== task.title) {
      changes.push(`название с "${oldTask.title}" на "${task.title}"`);
    }
    if (oldTask.status !== task.status) {
      changes.push(`статус с "${oldTask.status}" на "${task.status}"`);
    }
    if (oldTask.priority !== task.priority) {
      changes.push(`приоритет с "${oldTask.priority}" на "${task.priority}"`);
    }
    if (oldTask.deadline !== task.deadline) {
      changes.push(`дедлайн с "${oldTask.deadline}" на "${task.deadline}"`);
    }
    if (oldTask.responsible !== task.responsible) {
      changes.push(`ответственного с "${oldTask.responsible || '—'}" на "${task.responsible || '—'}"`);
    }
    if (oldTask.engineer !== task.engineer) {
      changes.push(`инженера с "${oldTask.engineer || '—'}" на "${task.engineer || '—'}"`);
    }
    if (oldTask.receivedAt !== task.receivedAt) {
      changes.push(`дату поступления с "${oldTask.receivedAt}" на "${task.receivedAt}"`);
    }
    if (oldTask.completedAt !== task.completedAt) {
      changes.push(`дату завершения с "${oldTask.completedAt || '—'}" на "${task.completedAt || '—'}"`);
    }
    if (oldTask.description !== task.description) {
      changes.push('описание задачи');
    }
    if (JSON.stringify(oldTask.customFields) !== JSON.stringify(task.customFields)) {
      changes.push('дополнительные поля');
    }

    if (changes.length > 0) {
      await prisma.projectHistory.create({
        data: {
          projectId,
          date: new Date().toISOString(),
          user: currentUser.name || currentUser.email,
          action: 'Изменена задача',
          details: `"${task.title}": ${changes.join(', ')}`,
        },
      });

      if (task.responsible) {
        try {
          const responsibleUserId = responsibleUserIdFrom(task.customFields);
          const responsibleUser = await prisma.user.findFirst({
            where: {
              ...(responsibleUserId ? { id: responsibleUserId } : { name: task.responsible }),
              status: 'active',
              isBlocked: false,
            },
            select: { email: true },
          });

          if (responsibleUser) {
            const responsibleChanged = oldTask.responsible !== task.responsible;
            const projectUrl = `${appUrl()}/projects?project=${projectId}`;
            const emailData = responsibleChanged
              ? emailTemplates.taskAssignment({
                  projectName: escapeHtml(project.name),
                  taskTitle: escapeHtml(task.title),
                  deadline: task.deadline ? escapeHtml(task.deadline) : undefined,
                  assignedBy: escapeHtml(currentUser.name || currentUser.email),
                  projectUrl,
                })
              : emailTemplates.taskUpdate({
                  projectName: escapeHtml(project.name),
                  taskTitle: escapeHtml(task.title),
                  changes: changes.map(change => escapeHtml(change)).join('<br>'),
                  updatedBy: escapeHtml(currentUser.name || currentUser.email),
                  projectUrl,
                });

            await sendEmail({
              to: responsibleUser.email,
              subject: emailData.subject,
              html: emailData.html,
            });
          }
        } catch (emailError) {
            // Сохранение задачи важнее доставки письма: SMTP может быть временно недоступен.
            console.error('[TASK_EMAIL] Failed:', emailError);
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

    if (task.responsible) {
      try {
        const responsibleUserId = responsibleUserIdFrom(task.customFields);
        const [project, responsibleUser] = await Promise.all([
          prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
          prisma.user.findFirst({
            where: {
              ...(responsibleUserId ? { id: responsibleUserId } : { name: task.responsible }),
              status: 'active',
              isBlocked: false,
            },
            select: { email: true },
          }),
        ]);

        if (project && responsibleUser) {
          const emailData = emailTemplates.taskUpdate({
            projectName: escapeHtml(project.name),
            taskTitle: escapeHtml(task.title),
            changes: 'Задача удалена',
            updatedBy: escapeHtml(currentUser.name || currentUser.email),
            projectUrl: `${appUrl()}/projects?project=${projectId}`,
          });
          await sendEmail({ to: responsibleUser.email, ...emailData });
        }
      } catch (emailError) {
        console.error('[TASK_DELETE_EMAIL] Failed:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
