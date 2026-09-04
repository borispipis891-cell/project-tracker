import { prisma } from '@/lib/prisma';

/**
 * Проверка, является ли пользователь администратором
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'admin';
}

/**
 * Проверка доступа пользователя к проекту (чтение)
 * TODO: В текущей схеме нет ProjectMember и TaskAssignee
 */
export async function canUserAccessProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  // Администратор видит всё
  if (await isAdmin(userId)) {
    return true;
  }

  // TODO: Реализовать проверку прав доступа когда появится соответствующая схема
  return true;
}

/**
 * Проверка права пользователя изменять проект
 * TODO: В текущей схеме нет ownerId и ProjectMember
 */
export async function canUserModifyProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  // Администратор может изменять всё
  if (await isAdmin(userId)) {
    return true;
  }

  // TODO: Реализовать проверку прав когда появится соответствующая схема
  return true;
}

/**
 * Получить список проектов, доступных пользователю
 * TODO: В текущей схеме все проекты доступны всем
 */
export async function getUserAccessibleProjectIds(
  userId: string
): Promise<number[]> {
  // Администратор видит все проекты
  if (await isAdmin(userId)) {
    const allProjects = await prisma.project.findMany({
      select: { id: true },
    });
    return allProjects.map((p) => p.id);
  }

  // TODO: Реализовать фильтрацию когда появится соответствующая схема
  const allProjects = await prisma.project.findMany({
    select: { id: true },
  });
  return allProjects.map((p) => p.id);
}
