import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { emailTemplates, sendEmail } from '@/lib/email';

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, projectId, taskId } = await request.json();
  const normalizedText = String(text || '').trim();
  if (!normalizedText || (!projectId && !taskId)) {
    return NextResponse.json({ error: 'Комментарий и объект обязательны' }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      author: session.user.name || session.user.email,
      text: normalizedText,
      date: new Date().toISOString(),
      userId: session.user.id,
      projectId: taskId ? null : Number(projectId),
      taskId: taskId ? Number(taskId) : null,
    },
    select: { id: true, author: true, date: true, text: true },
  });

  try {
    if (taskId) {
      const task = await prisma.task.findUnique({
      where: { id: Number(taskId) },
      select: {
        title: true,
        responsible: true,
        projectId: true,
        Project: { select: { name: true } },
      },
    });

      if (task?.responsible) {
        const responsibleUser = await prisma.user.findFirst({
        where: { name: task.responsible, status: 'active', isBlocked: false },
        select: { email: true },
      });

        if (responsibleUser) {
          const emailData = emailTemplates.taskUpdate({
          projectName: escapeHtml(task.Project.name),
          taskTitle: escapeHtml(task.title),
          changes: `Добавлен комментарий: «${escapeHtml(normalizedText)}»`,
          updatedBy: escapeHtml(session.user.name || session.user.email),
          projectUrl: `${process.env.APP_URL || process.env.NEXTAUTH_URL || ''}/projects?project=${task.projectId}`,
        });

          await sendEmail({ to: responsibleUser.email, ...emailData });
        }
      }
    }
  } catch (emailError) {
    console.error('[TASK_COMMENT_EMAIL] Failed:', emailError);
  }

  return NextResponse.json(comment);
}
