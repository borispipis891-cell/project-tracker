import { prisma } from '@/lib/prisma';
import { emailTemplates, sendEmail } from '@/lib/email';
import { getNotificationSettings } from '@/lib/notification-settings';

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const responsibleUserIdFrom = (customFields: unknown) => {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return null;
  const value = (customFields as Record<string, unknown>).__responsibleUserId;
  return typeof value === 'string' && value ? value : null;
};

export async function sendCommentNotifications(input: {
  projectId: number;
  taskId?: number | null;
  text: string;
  authorName: string;
  authorEmail: string;
}) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: {
      id: true,
      name: true,
      responsible: true,
      customFields: true,
      Task: {
        where: { id: input.taskId || -1 },
        select: { id: true, title: true, responsible: true, customFields: true },
      },
    },
  });

  if (!project) return;

  const task = input.taskId ? project.Task[0] : null;
  const hasTaskResponsible = !!(responsibleUserIdFrom(task?.customFields) || task?.responsible);
  const responsibleId = hasTaskResponsible
    ? responsibleUserIdFrom(task?.customFields)
    : responsibleUserIdFrom(project.customFields);
  const responsibleName = (hasTaskResponsible ? task?.responsible : project.responsible) || '';
  if (!responsibleId && !responsibleName) return;

  const recipient = await prisma.user.findFirst({
    where: {
      ...(responsibleId ? { id: responsibleId } : { name: responsibleName }),
      status: 'active',
      isBlocked: false,
      emailVerified: true,
      email: { not: input.authorEmail },
    },
    select: { email: true, notificationSettings: true },
  });
  if (!recipient || !getNotificationSettings(recipient.notificationSettings).emailOnComment) return;

  const projectUrl = `${process.env.APP_URL || process.env.NEXTAUTH_URL || ''}/projects?project=${project.id}`;
  const emailData = emailTemplates.commentAdded({
    projectName: escapeHtml(project.name),
    taskTitle: task?.title ? escapeHtml(task.title) : undefined,
    comment: escapeHtml(input.text),
    author: escapeHtml(input.authorName),
    projectUrl,
  });
  await sendEmail({ to: recipient.email, ...emailData });
}
