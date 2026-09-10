import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ADMIN_EMAIL, isAdminEmail } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

async function getAdminSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.email && isAdminEmail(session.user.email) ? session : null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const name = String((await request.json()).name || '').trim();
  if (name.length < 2) {
    return NextResponse.json({ error: 'Имя должно содержать минимум 2 символа' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

  const updated = await prisma.$transaction(async tx => {
    await Promise.all([
      tx.project.updateMany({ where: { responsible: user.name }, data: { responsible: name } }),
      tx.project.updateMany({ where: { engineer: user.name }, data: { engineer: name } }),
      tx.task.updateMany({ where: { responsible: user.name }, data: { responsible: name } }),
      tx.task.updateMany({ where: { engineer: user.name }, data: { engineer: name } }),
    ]);
    return tx.user.update({
      where: { id: user.id },
      data: { name },
      select: { id: true, name: true, email: true, isBlocked: true, createdAt: true },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true, name: true } });
  if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
  if (user.email.toLowerCase() === ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Нельзя удалить аккаунт администратора' }, { status: 400 });
  }

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!admin) return NextResponse.json({ error: 'Аккаунт администратора не найден' }, { status: 409 });

  await prisma.$transaction([
    prisma.project.updateMany({ where: { ownerId: user.id }, data: { ownerId: admin.id } }),
    prisma.project.updateMany({ where: { responsible: user.name }, data: { responsible: '' } }),
    prisma.task.updateMany({ where: { responsible: user.name }, data: { responsible: null } }),
    prisma.comment.updateMany({ where: { userId: user.id }, data: { userId: null } }),
    prisma.projectHistory.updateMany({ where: { userId: user.id }, data: { userId: null } }),
    prisma.invitation.deleteMany({ where: { invitedBy: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return NextResponse.json({ success: true });
}
