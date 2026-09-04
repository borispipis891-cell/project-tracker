import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';

// Этот endpoint можно вызывать через cron (например, раз в день в 9:00)
export async function POST(request: Request) {
  try {
    // Проверяем секретный ключ для защиты endpoint
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    const oneDayLater = new Date(today);
    oneDayLater.setDate(today.getDate() + 1);

    // Находим проекты с дедлайнами через 3 дня или 1 день
    const projects = await prisma.project.findMany({
      where: {
        status: {
          not: 'completed',
        },
        deadline: {
          in: [
            threeDaysLater.toISOString().split('T')[0],
            oneDayLater.toISOString().split('T')[0],
          ],
        },
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            notificationSettings: true,
          },
        },
        ProjectMember: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                notificationSettings: true,
              },
            },
          },
        },
      },
    });

    const notifications = [];

    for (const project of projects) {
      const deadline = new Date(project.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Собираем всех получателей (владелец + участники)
      const recipients = [project.User];
      project.ProjectMember.forEach(member => {
        recipients.push(member.User);
      });

      // Отправляем уведомления
      for (const recipient of recipients) {
        if (!recipient) continue;

        const userSettings = recipient.notificationSettings as any;
        const shouldNotify = !userSettings || userSettings.deadlineReminders !== false;

        if (shouldNotify) {
          const emailData = emailTemplates.deadlineReminder({
            projectName: project.name,
            deadline: project.deadline,
            daysLeft,
            projectUrl: `${process.env.APP_URL}/projects?project=${project.id}`,
          });

          const result = await sendEmail({
            to: recipient.email,
            subject: emailData.subject,
            html: emailData.html,
          });

          notifications.push({
            projectId: project.id,
            projectName: project.name,
            recipient: recipient.email,
            daysLeft,
            sent: result.success,
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
