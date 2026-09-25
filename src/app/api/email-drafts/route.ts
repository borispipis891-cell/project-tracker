import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminEmail } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (!isAdminEmail(session.user.email)) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const requestedStatus = searchParams.get('status');
  const status = requestedStatus && requestedStatus !== 'all' ? requestedStatus : undefined;

  const [drafts, projects, users, pendingCount] = await Promise.all([
    prisma.emailTaskDraft.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { status: 'active', isBlocked: false },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.emailTaskDraft.count({ where: { status: { in: ['pending', 'error'] } } }),
  ]);

  return NextResponse.json({ drafts, projects, users, pendingCount });
}
