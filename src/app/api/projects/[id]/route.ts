import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getUserProjectRole } from '@/lib/project-permissions';
import { sendEmail, emailTemplates } from '@/lib/email';

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

    // Check access
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canView) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Task: {
          orderBy: { createdAt: 'desc' },
        },
        Comment: {
          orderBy: { createdAt: 'desc' },
        },
        ProjectHistory: {
          orderBy: { createdAt: 'desc' },
        },
        Attachment: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Add user role info and aliases for frontend compatibility
    return NextResponse.json({
      ...project,
      owner: project.User,
      tasks: project.Task,
      comments: project.Comment,
      history: project.ProjectHistory,
      attachments: project.Attachment,
      userRole: permissions.role,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      canInvite: permissions.canInvite,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Check edit access
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canEdit) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await request.json();

    // Get old project data to detect changes
    const oldProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!oldProject) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: body.name,
        receivedAt: body.receivedAt,
        deadline: body.deadline,
        completedAt: body.completedAt,
        customer: body.customer,
        pss: body.pss,
        reg: body.reg,
        status: body.status,
        priority: body.priority,
        responsible: body.responsible,
        engineer: body.engineer,
        color: body.color,
        tags: body.tags || [],
        customFields: body.customFields,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Task: {
          orderBy: { createdAt: 'desc' },
        },
        Comment: {
          orderBy: { createdAt: 'desc' },
        },
        ProjectHistory: {
          orderBy: { createdAt: 'desc' },
        },
        Attachment: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Detect changes and create history entries
    const changes: string[] = [];

    if (oldProject.name !== body.name) {
      changes.push(`название с "${oldProject.name}" на "${body.name}"`);
    }
    if (oldProject.status !== body.status) {
      changes.push(`статус с "${oldProject.status}" на "${body.status}"`);
    }
    if (oldProject.priority !== body.priority) {
      changes.push(`приоритет с "${oldProject.priority}" на "${body.priority}"`);
    }
    if (oldProject.deadline !== body.deadline) {
      changes.push(`дедлайн с "${oldProject.deadline}" на "${body.deadline}"`);
    }
    if (oldProject.responsible !== body.responsible) {
      changes.push(`ответственного с "${oldProject.responsible}" на "${body.responsible}"`);
    }
    if (oldProject.engineer !== body.engineer) {
      changes.push(`инженера с "${oldProject.engineer}" на "${body.engineer}"`);
    }
    if (oldProject.customer !== body.customer) {
      changes.push(`заказчика с "${oldProject.customer}" на "${body.customer}"`);
    }
    if (oldProject.color !== body.color) {
      changes.push(`цвет проекта`);
    }
    if (JSON.stringify(oldProject.tags) !== JSON.stringify(body.tags || [])) {
      changes.push(`теги проекта`);
    }

    if (changes.length > 0) {
      await prisma.projectHistory.create({
        data: {
          projectId,
          date: new Date().toISOString(),
          user: currentUser.name || currentUser.email,
          action: 'Изменён проект',
          details: changes.join(', '),
        },
      });

      // Отправляем уведомления участникам проекта
      const members = await prisma.projectMember.findMany({
        where: { projectId },
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
      });

      // Отправляем email всем участникам (кроме текущего пользователя)
      for (const member of members) {
        if (member.userId !== currentUser.id) {
          const userSettings = member.User.notificationSettings as any;
          const shouldNotify = !userSettings || userSettings.projectUpdates !== false;

          if (shouldNotify) {
            const emailData = emailTemplates.projectUpdate({
              projectName: project.name,
              changes: changes.map(c => `Изменено ${c}`).join('<br>'),
              updatedBy: currentUser.name || currentUser.email,
              projectUrl: `${process.env.APP_URL}/projects?project=${projectId}`,
            });

            await sendEmail({
              to: member.User.email,
              subject: emailData.subject,
              html: emailData.html,
            });
          }
        }
      }
    }

    return NextResponse.json({
      ...project,
      owner: project.User,
      tasks: project.Task,
      comments: project.Comment,
      history: project.ProjectHistory,
      attachments: project.Attachment,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

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

    // Check delete access (only owner)
    const permissions = await getUserProjectRole(currentUser.id, projectId);
    if (!permissions?.canDelete) {
      return NextResponse.json({ error: 'Доступ запрещен. Только владелец может удалить проект' }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
