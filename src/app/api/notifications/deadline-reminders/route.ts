import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, emailTemplates } from '@/lib/email';
import { getNotificationSettings } from '@/lib/notification-settings';

const responsibleUserIdFrom = (customFields: unknown) => {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return null;
  const value = (customFields as Record<string, unknown>).__responsibleUserId;
  return typeof value === 'string' && value ? value : null;
};

// Vercel Cron вызывает endpoint методом GET. POST оставлен для ручной проверки.
async function sendDeadlineReminders(request: Request) {
  try {
    // Проверяем секретный ключ для защиты endpoint
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    const oneDayLater = new Date(today);
    oneDayLater.setDate(today.getDate() + 1);

    // Находим проекты с дедлайнами через 3 дня или 1 день
    const projects = await prisma.project.findMany({
      where: {
        status: { notIn: ['done', 'blocked'] },
        deletedAt: null,
        deadline: {
          in: [
            threeDaysLater.toISOString().split('T')[0],
            oneDayLater.toISOString().split('T')[0],
          ],
        },
      },
    });

    const recipients = await prisma.user.findMany({
      where: { status: 'active', isBlocked: false, emailVerified: true },
      select: { id: true, name: true, email: true, notificationSettings: true },
    });

    const notifications = [];

    for (const project of projects) {
      const deadline = new Date(project.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Проекты общие, поэтому уведомляем всех активных пользователей,
      // которые не отключили напоминания о дедлайнах.
      for (const recipient of recipients) {
        const userSettings = getNotificationSettings(recipient.notificationSettings);
        const responsibleUserId = responsibleUserIdFrom(project.customFields);
        const matchesScope = userSettings.projectScope === 'all'
          || recipient.id === responsibleUserId
          || recipient.name === project.responsible;
        const shouldNotify = userSettings.emailOnDeadline && matchesScope;

        if (shouldNotify) {
          const emailData = emailTemplates.deadlineReminder({
            projectName: project.name,
            deadline: project.deadline,
            daysLeft,
            projectUrl: `${process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/projects?project=${project.id}`,
          });

          let sent = false;
          try {
            await sendEmail({
              to: recipient.email,
              subject: emailData.subject,
              html: emailData.html,
            });
            sent = true;
          } catch (error) {
            console.error('Failed to send email to', recipient.email, error);
          }

          notifications.push({
            projectId: project.id,
            projectName: project.name,
            recipient: recipient.email,
            daysLeft,
            sent,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('Error sending deadline reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return sendDeadlineReminders(request);
}

export async function POST(request: Request) {
  return sendDeadlineReminders(request);
}
