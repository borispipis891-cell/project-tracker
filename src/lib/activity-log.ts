import { prisma } from '@/lib/prisma';

/**
 * Логировать изменение в истории активности
 * TODO: В текущей схеме нет модели ActivityLog
 */
export async function logActivity(
  entityType: 'PROJECT' | 'TASK' | 'COMMENT',
  entityId: string,
  userId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null
) {
  try {
    // TODO: Добавить модель ActivityLog в схему
    console.log('Activity:', { entityType, entityId, userId, field, oldValue, newValue });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Логировать несколько изменений одновременно
 * TODO: В текущей схеме нет модели ActivityLog
 */
export async function logActivities(
  activities: Array<{
    entityType: 'PROJECT' | 'TASK' | 'COMMENT';
    entityId: string;
    userId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }>
) {
  try {
    // TODO: Добавить модель ActivityLog в схему
    console.log('Activities:', activities);
  } catch (error) {
    console.error('Error logging activities:', error);
  }
}

/**
 * Получить историю изменений для сущности
 * TODO: В текущей схеме нет модели ActivityLog
 */
export async function getActivityLog(
  entityType: 'PROJECT' | 'TASK' | 'COMMENT',
  entityId: string,
  limit = 100
) {
  // TODO: Добавить модель ActivityLog в схему
  return [];
}

/**
 * Получить последние изменения пользователя
 * TODO: В текущей схеме нет модели ActivityLog
 */
export async function getUserActivityLog(userId: string, limit = 50) {
  // TODO: Добавить модель ActivityLog в схему
  return [];
}

/**
 * Форматировать запись истории в человекочитаемый текст
 */
export function formatActivityLogEntry(activity: {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
}): string {
  const userName = activity.user.name || activity.user.email;
  const date = activity.createdAt.toLocaleString('ru-RU');

  if (activity.field === 'created') {
    return `${date} — ${userName} создал(а): ${activity.newValue}`;
  }

  if (activity.field === 'deleted') {
    return `${date} — ${userName} удалил(а)`;
  }

  const oldVal = activity.oldValue || '(пусто)';
  const newVal = activity.newValue || '(пусто)';

  return `${date} — ${userName} изменил(а) ${activity.field}: ${oldVal} → ${newVal}`;
}
