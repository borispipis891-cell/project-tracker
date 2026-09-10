import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

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

  return NextResponse.json(comment);
}
