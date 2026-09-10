import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminEmail } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, isBlocked: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invitation.findMany({
      where: { status: 'pending', expiresAt: { gt: new Date() } },
      select: { id: true, email: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({ users, invitations });
}
