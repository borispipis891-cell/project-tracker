import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { sendCommentNotifications } from '@/lib/comment-notifications';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, projectId, taskId } = await request.json();
  const normalizedText = String(text || '').trim();
  if (!normalizedText || (!projectId && !taskId)) {
    return NextResponse.json({ error: 'Комментарий и объект обязательны' }, { status: 400 });
  }

  const resolvedTask = taskId ? await prisma.task.findUnique({
    where: { id: Number(taskId) },
    select: { id: true, title: true, projectId: true },
  }) : null;
  const resolvedProjectId = resolvedTask?.projectId || Number(projectId);
  if (!resolvedProjectId || (taskId && !resolvedTask)) {
    return NextResponse.json({ error: 'Проект или задача не найдены' }, { status: 404 });
  }

  const projectExists = await prisma.project.findFirst({
    where: { id: resolvedProjectId, deletedAt: null },
    select: { id: true },
  });
  if (!projectExists) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

  const author = session.user.name || session.user.email;
  const now = new Date().toISOString();
  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        author,
        text: normalizedText,
        date: now,
        userId: session.user.id,
        projectId: taskId ? null : resolvedProjectId,
        taskId: taskId ? Number(taskId) : null,
      },
      select: { id: true, author: true, date: true, text: true },
    }),
    prisma.projectHistory.create({
      data: {
        projectId: resolvedProjectId,
        date: now,
        user: author,
        userId: session.user.id,
        action: 'Добавлен комментарий',
        details: resolvedTask
          ? `Задача «${resolvedTask.title}»: ${normalizedText}`
          : normalizedText,
      },
    }),
  ]);

  try {
    await sendCommentNotifications({
      projectId: resolvedProjectId,
      taskId: taskId ? Number(taskId) : null,
      text: normalizedText,
      authorName: author,
      authorEmail: session.user.email,
    });
  } catch (emailError) {
    console.error('[COMMENT_EMAIL] Failed:', emailError);
  }

  return NextResponse.json(comment);
}
