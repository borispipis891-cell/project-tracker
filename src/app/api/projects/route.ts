import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

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

    const project = await prisma.project.create({
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
        customFields: body.customFields || {},
        ownerId: currentUser.id,
        Task: {
          create: body.tasks || [],
        },
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

    // Add history entry for project creation
    await prisma.projectHistory.create({
      data: {
        projectId: project.id,
        date: new Date().toISOString(),
        user: currentUser.name || currentUser.email,
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
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
