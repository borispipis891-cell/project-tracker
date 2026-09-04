import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getUserProjectRole } from '@/lib/project-permissions';
import { sendEmail, emailTemplates } from '@/lib/email';

// GET - получить список участников проекта
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const projectId = parseInt(params.id);

    // Проверяем доступ
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canView) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST - пригласить пользователя в проект
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const projectId = parseInt(params.id);

    // Проверяем право на приглашение (только владелец)
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canInvite) {
      return NextResponse.json({ error: 'Доступ запрещен. Только владелец может приглашать участников' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email и роль обязательны' }, { status: 400 });
    }

    // Находим пользователя по email
    const invitedUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Если пользователь НЕ зарегистрирован, создаём приглашение с токеном
    if (!invitedUser) {
      // Проверяем, есть ли уже активное приглашение
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          email: email.toLowerCase(),
          projectId,
          status: 'pending',
        },
      });

      if (existingInvitation) {
        return NextResponse.json({ error: 'Приглашение уже отправлено на этот email' }, { status: 400 });
      }

      // Создаём токен приглашения
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      // Создаём приглашение (срок действия 7 дней)
      await prisma.invitation.create({
        data: {
          email: email.toLowerCase(),
          role,
          token,
          projectId,
          invitedBy: currentUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
        },
      });

      // Отправляем письмо с приглашением зарегистрироваться
      const inviteUrl = `${process.env.APP_URL}/accept-invite?token=${token}`;

      await sendEmail({
        to: email,
        subject: `Приглашение в проект "${project.name}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Приглашение в проект</h2>

            <p>Здравствуйте!</p>

            <p><strong>${currentUser.name || currentUser.email}</strong> приглашает вас присоединиться к проекту <strong>"${project.name}"</strong> в системе Project Tracker.</p>

            <p>Ваша роль: <strong>${role === 'editor' ? 'Редактор' : 'Наблюдатель'}</strong></p>

            <div style="margin: 30px 0;">
              <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Принять приглашение
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              Если у вас ещё нет аккаунта, вы будете перенаправлены на страницу регистрации.
            </p>

            <p style="color: #6b7280; font-size: 14px;">
              Ссылка действительна 7 дней.
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="color: #9ca3af; font-size: 12px;">
              Если кнопка не работает, скопируйте эту ссылку: <br/>
              <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
            </p>
          </div>
        `,
      });

      return NextResponse.json({
        message: 'Приглашение отправлено',
        pending: true,
      });
    }

    // Пользователь ЗАРЕГИСТРИРОВАН - проверяем, не является ли он уже участником
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        userId: invitedUser.id,
        projectId,
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'Пользователь уже является участником проекта' }, { status: 400 });
    }

    // Получаем проект для отправки email (уже получили выше, удаляем дубликат)
    // const project = await prisma.project.findUnique(...)

    // Добавляем участника
    const member = await prisma.projectMember.create({
      data: {
        userId: invitedUser.id,
        projectId,
        role,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Проверяем настройки уведомлений пользователя
    const userSettings = invitedUser.notificationSettings as any;
    const shouldNotify = !userSettings || userSettings.projectInvites !== false;

    // Отправляем email уведомление
    if (shouldNotify) {
      const emailData = emailTemplates.projectInvite({
        inviterName: currentUser.name || currentUser.email,
        projectName: project.name,
        role: role === 'editor' ? 'Редактор' : 'Наблюдатель',
        projectUrl: `${process.env.APP_URL}/projects?project=${projectId}`,
      });

      await sendEmail({
        to: invitedUser.email,
        subject: emailData.subject,
        html: emailData.html,
      });
    }

    // Добавляем запись в историю
    await prisma.projectHistory.create({
      data: {
        projectId,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        action: 'Добавлен участник',
        details: `${invitedUser.name || invitedUser.email} (${role === 'editor' ? 'редактор' : 'наблюдатель'})`,
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}

// DELETE - удалить участника из проекта
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const projectId = parseInt(params.id);

    // Проверяем право на удаление участников (только владелец)
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canInvite) {
      return NextResponse.json({ error: 'Доступ запрещен. Только владелец может удалять участников' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) {
      return NextResponse.json({ error: 'userId обязателен' }, { status: 400 });
    }

    // Удаляем участника
    await prisma.projectMember.deleteMany({
      where: {
        userId: userIdToRemove,
        projectId,
      },
    });

    // Получаем имя удалённого пользователя для истории
    const removedUser = await prisma.user.findUnique({
      where: { id: userIdToRemove },
      select: { name: true, email: true },
    });

    // Добавляем запись в историю
    await prisma.projectHistory.create({
      data: {
        projectId,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        action: 'Удалён участник',
        details: removedUser?.name || removedUser?.email || userIdToRemove,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
