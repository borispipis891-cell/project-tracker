import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth-options';
import { isAdminEmail } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { syncProjectDeadline } from '@/lib/project-task-deadline';

const editSchema = z.object({
  action: z.literal('update'),
  title: z.string().trim().min(1).max(250),
  description: z.string().max(12000).default(''),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deadline: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]),
  projectId: z.number().int().positive().nullable(),
  responsibleId: z.string().nullable(),
});

const actionSchema = z.discriminatedUnion('action', [
  editSchema,
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject') }),
]);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (!isAdminEmail(session.user.email)) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные данные', details: parsed.error.flatten() }, { status: 400 });

  const draft = await prisma.emailTaskDraft.findUnique({ where: { id: params.id } });
  if (!draft) return NextResponse.json({ error: 'Черновик не найден' }, { status: 404 });
  if (!['pending', 'error'].includes(draft.status)) {
    return NextResponse.json({ error: 'Черновик уже обработан' }, { status: 409 });
  }

  if (parsed.data.action === 'reject') {
    const updated = await prisma.emailTaskDraft.update({
      where: { id: params.id },
      data: { status: 'rejected', approvedBy: session.user.id, approvedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  if (parsed.data.action === 'update') {
    const project = parsed.data.projectId
      ? await prisma.project.findFirst({ where: { id: parsed.data.projectId, deletedAt: null }, select: { id: true } })
      : null;
    if (parsed.data.projectId && !project) return NextResponse.json({ error: 'Проект не найден' }, { status: 400 });

    const responsible = parsed.data.responsibleId
      ? await prisma.user.findFirst({
          where: { id: parsed.data.responsibleId, status: 'active', isBlocked: false },
          select: { id: true, name: true },
        })
      : null;
    if (parsed.data.responsibleId && !responsible) return NextResponse.json({ error: 'Исполнитель не найден' }, { status: 400 });

    const updated = await prisma.emailTaskDraft.update({
      where: { id: params.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        receivedAt: parsed.data.receivedAt,
        deadline: parsed.data.deadline,
        projectId: parsed.data.projectId,
        responsibleId: responsible?.id || null,
        responsible: responsible?.name || null,
        status: 'pending',
        errorMessage: null,
      },
    });
    return NextResponse.json(updated);
  }

  if (!draft.projectId) return NextResponse.json({ error: 'Выберите проект перед подтверждением' }, { status: 400 });
  const project = await prisma.project.findFirst({
    where: { id: draft.projectId, deletedAt: null },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Выбранный проект не найден' }, { status: 400 });

  try {
    const task = await prisma.$transaction(async tx => {
      const claimed = await tx.emailTaskDraft.updateMany({
        where: { id: draft.id, status: { in: ['pending', 'error'] } },
        data: { status: 'approving' },
      });
      if (claimed.count !== 1) throw new Error('DRAFT_ALREADY_PROCESSED');

      const created = await tx.task.create({
        data: {
          projectId: draft.projectId!,
          title: draft.title,
          description: draft.description,
          status: 'not_started',
          priority: draft.priority,
          receivedAt: draft.receivedAt,
          deadline: draft.deadline,
          dueDate: draft.deadline,
          responsible: draft.responsible,
          customFields: draft.responsibleId ? { __responsibleUserId: draft.responsibleId, __source: 'email' } : { __source: 'email' },
        },
      });

      await tx.projectHistory.create({
        data: {
          projectId: draft.projectId!,
          date: new Date().toISOString(),
          user: session.user.name || session.user.email,
          action: 'Добавлена задача из письма',
          details: `"${draft.title}"`,
          userId: session.user.id,
        },
      });

      await tx.emailTaskDraft.update({
        where: { id: draft.id },
        data: {
          status: 'approved',
          approvedBy: session.user.id,
          approvedAt: new Date(),
          createdTaskId: created.id,
        },
      });
      return created;
    });

    await syncProjectDeadline(draft.projectId);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    if (error instanceof Error && error.message === 'DRAFT_ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'Черновик уже обрабатывается или обработан' }, { status: 409 });
    }
    console.error('[EMAIL_DRAFT_APPROVE]', error);
    return NextResponse.json({ error: 'Не удалось создать задачу' }, { status: 500 });
  }
}
