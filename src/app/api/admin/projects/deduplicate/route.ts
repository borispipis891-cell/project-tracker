import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminEmail } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Удалять дубликаты может только администратор' }, { status: 403 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        receivedAt: true,
        deadline: true,
        customer: true,
        pss: true,
        reg: true,
        ownerId: true,
        createdAt: true,
        _count: { select: { Task: true } },
      },
    });

    const groups = new Map<string, typeof projects>();
    for (const project of projects) {
      const key = [
        project.ownerId || '',
        normalize(project.name),
        project.receivedAt,
        project.deadline,
        normalize(project.customer),
        normalize(project.pss),
        normalize(project.reg),
      ].join('\u001f');
      groups.set(key, [...(groups.get(key) || []), project]);
    }

    const duplicateIds: number[] = [];
    let duplicateGroups = 0;
    const clusterWindowMs = 5 * 60 * 1000;

    for (const matchingProjects of groups.values()) {
      let cluster: typeof projects = [];
      const flushCluster = () => {
        if (cluster.length < 2) {
          cluster = [];
          return;
        }
        duplicateGroups += 1;
        const [keeper, ...duplicates] = [...cluster].sort((a, b) =>
          b._count.Task - a._count.Task || a.createdAt.getTime() - b.createdAt.getTime(),
        );
        void keeper;
        duplicateIds.push(...duplicates.map(project => project.id));
        cluster = [];
      };

      for (const project of matchingProjects) {
        const previous = cluster.at(-1);
        if (previous && project.createdAt.getTime() - previous.createdAt.getTime() > clusterWindowMs) {
          flushCluster();
        }
        cluster.push(project);
      }
      flushCluster();
    }

    if (duplicateIds.length > 0) {
      await prisma.project.updateMany({
        where: { id: { in: duplicateIds } },
        data: { deletedAt: new Date() },
      });
    }

    return NextResponse.json({ deleted: duplicateIds.length, groups: duplicateGroups });
  } catch (error) {
    console.error('[DEDUPLICATE_PROJECTS]', error);
    return NextResponse.json({ error: 'Не удалось удалить дубликаты проектов' }, { status: 500 });
  }
}
