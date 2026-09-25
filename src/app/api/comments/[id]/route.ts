import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id: Number(params.id) },
    select: {
      id: true,
      text: true,
      projectId: true,
      Task: { select: { title: true, projectId: true } },
    },
  });
  if (!comment) return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });

  const resolvedProjectId = comment.projectId || comment.Task?.projectId;
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true },
  });

  await prisma.$transaction([
    prisma.comment.delete({ where: { id: comment.id } }),
    ...(resolvedProjectId && currentUser ? [prisma.projectHistory.create({
      data: {
        projectId: resolvedProjectId,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        userId: currentUser.id,
        action: 'Удалён комментарий',
        details: comment.Task
          ? `Задача «${comment.Task.title}»: ${comment.text}`
          : comment.text,
      },
    })] : []),
  ]);
  return NextResponse.json({ success: true });
}
