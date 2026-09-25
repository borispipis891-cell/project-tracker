import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { emailTemplates, sendEmail } from '@/lib/email';

const responsibleUserIdFrom = (customFields: unknown) => {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return null;
  const value = (customFields as Record<string, unknown>).__responsibleUserId;
  return typeof value === 'string' && value ? value : null;
};

export async function GET() {
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

    // Every authenticated user sees every project.
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ProjectMember: {
          where: {
            userId: currentUser.id,
          },
          select: {
            role: true,
          },
        },
        Task: {
          orderBy: { createdAt: 'desc' },
          include: { Comment: { orderBy: { createdAt: 'asc' } } },
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
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Add user role info to each project
    const projectsWithRole = projects.map((project) => {
      const isOwner = project.ownerId === currentUser.id;
      return {
        ...project,
        owner: project.User, // Add owner alias for frontend compatibility
        tasks: project.Task.map(task => ({ ...task, comments: task.Comment })),
        comments: project.Comment, // Add comments alias
        attachments: project.Attachment, // Add attachments alias
        history: project.ProjectHistory, // Add history alias
        members: project.ProjectMember, // Add members alias
        userRole: isOwner ? 'owner' : 'editor',
        canEdit: true,
        canDelete: isOwner,
        canInvite: isOwner,
      };
    });

    return NextResponse.json(projectsWithRole);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    console.log('[CREATE_PROJECT] Received data:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Название проекта обязательно' }, { status: 400 });
    }
    if (!body.status) {
      return NextResponse.json({ error: 'Статус проекта обязателен' }, { status: 400 });
    }
    if (!body.priority) {
      return NextResponse.json({ error: 'Приоритет проекта обязателен' }, { status: 400 });
    }

    const projectData = {
      name: body.name,
      receivedAt: body.receivedAt || new Date().toISOString().split('T')[0],
      deadline: body.deadline || new Date().toISOString().split('T')[0],
      completedAt: body.completedAt || null,
      customer: body.customer || '',
      pss: body.pss || '',
      reg: body.reg || '',
      status: body.status,
      priority: body.status === 'done' ? 'low' : body.priority,
      responsible: body.responsible || '',
      engineer: body.engineer || '',
      customFields: body.customFields || {},
      ownerId: currentUser.id,
      color: body.color || '#3B82F6',
      tags: body.tags || [],
    };

    // Повторный POST с теми же реквизитами вскоре после создания обычно
    // означает повторный клик или сетевой retry. Не создаём ещё одну копию.
    const recentDuplicate = await prisma.project.findFirst({
      where: {
        ownerId: currentUser.id,
        deletedAt: null,
        name: projectData.name,
        receivedAt: projectData.receivedAt,
        deadline: projectData.deadline,
        customer: projectData.customer,
        pss: projectData.pss,
        reg: projectData.reg,
        createdAt: { gte: new Date(Date.now() - 30_000) },
      },
      select: { id: true },
    });

    if (recentDuplicate) {
      return NextResponse.json(
        { error: 'Такой проект уже был создан. Повторный запрос отменён.' },
        { status: 409 },
      );
    }

    console.log('[CREATE_PROJECT] Creating with data:', JSON.stringify(projectData, null, 2));

    const initialTasks = Array.isArray(body.tasks)
      ? body.tasks
          .filter((task: unknown) => task && typeof task === 'object' && String((task as any).title || '').trim())
          .slice(0, 10)
          .map((task: any) => ({
            title: String(task.title).trim(),
            description: String(task.description || ''),
            status: task.status || 'not_started',
            priority: task.status === 'done' ? 'low' : task.priority || 'medium',
            receivedAt: task.receivedAt || projectData.receivedAt,
            deadline: task.deadline || projectData.deadline,
            dueDate: task.dueDate || task.deadline || projectData.deadline,
            completedAt: task.completedAt || null,
            responsible: task.responsible || projectData.responsible || null,
            engineer: task.engineer || projectData.engineer || null,
            customFields: task.customFields || {},
          }))
      : [];

    const project = await prisma.project.create({
      data: {
        ...projectData,
        deadline: initialTasks.reduce(
          (latest: string, task: { deadline: string }) => task.deadline > latest ? task.deadline : latest,
          initialTasks.length ? '' : projectData.deadline,
        ),
        ...(initialTasks.length ? { Task: { create: initialTasks } } : {}),
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Task: true,
        Comment: true,
        ProjectHistory: true,
        Attachment: true,
      },
    });

    console.log('[CREATE_PROJECT] Project created successfully:', project.id);

    // Add history entry for project creation
    await prisma.projectHistory.createMany({
      data: [{
        projectId: project.id,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        userId: currentUser.id,
        action: 'Создан проект',
        details: `"${body.name}"`,
      }, ...initialTasks.map((task: { title: string }) => ({
        projectId: project.id,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        userId: currentUser.id,
        action: 'Добавлена задача',
        details: `"${task.title}"`,
      }))],
    });

    if (project.responsible) {
      try {
        const responsibleUserId = responsibleUserIdFrom(project.customFields);
        const responsibleUser = await prisma.user.findFirst({
          where: {
            ...(responsibleUserId ? { id: responsibleUserId } : { name: project.responsible }),
            status: 'active',
            isBlocked: false,
          },
          select: { email: true },
        });

        if (responsibleUser) {
          const emailData = emailTemplates.projectAssignment({
            projectName: project.name,
            deadline: project.deadline || undefined,
            assignedBy: currentUser.name || currentUser.email,
            projectUrl: `${process.env.APP_URL || process.env.NEXTAUTH_URL || ''}/projects?project=${project.id}`,
          });
          await sendEmail({ to: responsibleUser.email, ...emailData });
        }
      } catch (emailError) {
        console.error('[PROJECT_ASSIGNMENT_EMAIL] Failed:', emailError);
      }
    }

    return NextResponse.json({
      ...project,
      owner: project.User, // Add owner alias for frontend compatibility
      tasks: project.Task, // Add tasks alias
      comments: project.Comment, // Add comments alias
      attachments: project.Attachment, // Add attachments alias
      history: project.ProjectHistory, // Add history alias
      userRole: 'owner',
      canEdit: true,
      canDelete: true,
      canInvite: true,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'stack' in error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
