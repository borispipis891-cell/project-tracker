import { prisma } from '@/lib/prisma';

/** Keeps the project deadline equal to the latest non-empty task deadline. */
export async function syncProjectDeadline(projectId: number): Promise<string> {
  const latestTask = await prisma.task.findFirst({
    where: { projectId, deletedAt: null, deadline: { not: '' } },
    select: { deadline: true },
    orderBy: { deadline: 'desc' },
  });
  const deadline = latestTask?.deadline || '';
  await prisma.project.update({
    where: { id: projectId },
    data: { deadline },
    select: { id: true },
  });
  return deadline;
}
