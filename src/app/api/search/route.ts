import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({
        projects: [],
        tasks: [],
        comments: []
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchQuery = query.toLowerCase();

    // Search projects
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { customer: { contains: searchQuery, mode: 'insensitive' } },
          { pss: { contains: searchQuery, mode: 'insensitive' } },
          { reg: { contains: searchQuery, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        customer: true,
        status: true,
        priority: true,
        deadline: true,
      },
      take: 10,
    });

    // Search tasks
    const tasks = await prisma.task.findMany({
      where: {
        title: { contains: searchQuery, mode: 'insensitive' },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        projectId: true,
        Project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 10,
    });

    // Search comments
    const comments = await prisma.comment.findMany({
      where: {
        text: { contains: searchQuery, mode: 'insensitive' },
      },
      select: {
        id: true,
        text: true,
        author: true,
        createdAt: true,
        Project: {
          select: {
            id: true,
            name: true,
          },
        },
        Task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      take: 10,
    });

    return NextResponse.json({
      projects: projects.map(p => ({
        ...p,
        type: 'project' as const,
      })),
      tasks: tasks.map(t => ({
        ...t,
        project: t.Project,
        type: 'task' as const,
      })),
      comments: comments.map(c => ({
        id: c.id,
        content: c.text,
        author: c.author,
        createdAt: c.createdAt,
        project: c.Project,
        task: c.Task,
        type: 'comment' as const,
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
