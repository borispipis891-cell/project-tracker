import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all projects (not deleted)
    const allProjects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: {
        status: true,
        priority: true,
        deadline: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const totalProjects = allProjects.length;

    // Count by status
    const statusCounts = allProjects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activeProjects = (statusCounts['active'] || 0) + (statusCounts['pending'] || 0);
    const completedProjects = statusCounts['completed'] || 0;

    // Count overdue projects
    const now = new Date();
    const overdueProjects = allProjects.filter((project) => {
      if (project.status === 'completed' || project.status === 'cancelled') {
        return false;
      }
      try {
        const deadline = new Date(project.deadline);
        return deadline < now;
      } catch {
        return false;
      }
    }).length;

    // Projects by status for pie chart
    const projectsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: name === 'active' ? 'Активные' :
            name === 'pending' ? 'Ожидают' :
            name === 'completed' ? 'Завершенные' :
            name === 'cancelled' ? 'Отмененные' : name,
      value,
      color: name === 'active' ? '#3B82F6' :
             name === 'pending' ? '#F59E0B' :
             name === 'completed' ? '#10B981' :
             name === 'cancelled' ? '#EF4444' : '#6B7280'
    }));

    // Count by priority
    const priorityCounts = allProjects.reduce((acc, project) => {
      acc[project.priority] = (acc[project.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const projectsByPriority = Object.entries(priorityCounts).map(([name, value]) => ({
      name: name === 'high' ? 'Высокий' :
            name === 'medium' ? 'Средний' :
            name === 'low' ? 'Низкий' : name,
      value
    }));

    // Projects by month (last 12 months)
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const projectsByMonth: { month: string; count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      const count = allProjects.filter((project) => {
        const projectDate = new Date(project.createdAt);
        const projectMonthKey = `${projectDate.getFullYear()}-${String(projectDate.getMonth() + 1).padStart(2, '0')}`;
        return projectMonthKey === monthKey;
      }).length;

      projectsByMonth.push({ month: monthLabel, count });
    }

    // Completion rate
    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

    // Get current user for recent projects
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    // Get recent projects (top 5) with tasks count
    const recentProjectsData = await prisma.project.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: currentUser?.id },
          {
            ProjectMember: {
              some: {
                userId: currentUser?.id,
              },
            },
          },
        ],
      },
      include: {
        Task: {
          select: { id: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    const recentProjects = recentProjectsData.map((project) => ({
      id: project.id,
      name: project.name,
      customer: project.customer,
      status: project.status,
      priority: project.priority,
      tasksCount: project.Task.length,
    }));

    // Count total tasks
    const totalTasks = await prisma.task.count({
      where: {
        Project: {
          deletedAt: null,
        },
      },
    });

    return NextResponse.json({
      totalProjects,
      activeProjects,
      completedProjects,
      overdueProjects,
      totalTasks,
      projectsByStatus,
      projectsByPriority,
      projectsByMonth,
      completionRate,
      recentProjects,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
