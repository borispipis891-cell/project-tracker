import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

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

    // Get projects where user is owner or member
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: currentUser.id },
          {
            ProjectMember: {
              some: {
                userId: currentUser.id,
              },
            },
          },
        ],
      },
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
      const memberRole = project.ProjectMember[0]?.role;

      return {
        ...project,
        owner: project.User, // Add owner alias for frontend compatibility
        tasks: project.Task, // Add tasks alias
        comments: project.Comment, // Add comments alias
        attachments: project.Attachment, // Add attachments alias
        history: project.ProjectHistory, // Add history alias
        members: project.ProjectMember, // Add members alias
        userRole: isOwner ? 'owner' : memberRole,
        canEdit: isOwner || memberRole === 'editor',
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
      priority: body.priority,
      responsible: body.responsible || '',
      engineer: body.engineer || '',
      customFields: body.customFields || {},
      ownerId: currentUser.id,
      color: body.color || '#3B82F6',
      tags: body.tags || [],
    };

    console.log('[CREATE_PROJECT] Creating with data:', JSON.stringify(projectData, null, 2));

    const project = await prisma.project.create({
      data: projectData,
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
    await prisma.projectHistory.create({
      data: {
        projectId: project.id,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
        userId: currentUser.id,
        action: 'Создан проект',
        details: `"${body.name}"`,
      },
    });

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
