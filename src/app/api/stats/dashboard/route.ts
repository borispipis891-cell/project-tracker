import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { ADMIN_EMAIL } from '@/lib/admin';

export const dynamic = 'force-dynamic';

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
        id: true,
        name: true,
        status: true,
        priority: true,
        deadline: true,
        completedAt: true,
        createdAt: true,
        responsible: true,
        engineer: true,
        customFields: true,
        Task: {
          where: { deletedAt: null },
          select: {
            status: true,
            priority: true,
            deadline: true,
            responsible: true,
            engineer: true,
            customFields: true,
          },
        },
      },
    });

    const totalProjects = allProjects.length;

    // Count by status
    const statusCounts = allProjects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activeProjects = (statusCounts['new'] || 0) +
      (statusCounts['progress'] || 0) +
      (statusCounts['waiting'] || 0) +
      (statusCounts['blocked'] || 0);
    const completedProjects = statusCounts['done'] || 0;

    // Count overdue projects
    const now = new Date();
    const overdueProjects = allProjects.filter((project) => {
      if (project.status === 'done') {
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
      name: name === 'new' ? 'Новые' :
            name === 'progress' ? 'В работе' :
            name === 'waiting' ? 'Ожидают' :
            name === 'blocked' ? '❄️ Заморожены' :
            name === 'done' ? 'Завершенные' : name,
      value,
      color: name === 'progress' ? '#3B82F6' :
             name === 'waiting' ? '#F59E0B' :
             name === 'done' ? '#10B981' :
             name === 'blocked' ? '#EF4444' : '#6B7280'
    }));

    // Count by priority
    const priorityCounts = allProjects.reduce((acc, project) => {
      acc[project.priority] = (acc[project.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const projectsByPriority = Object.entries(priorityCounts).map(([name, value]) => ({
      name: name === 'critical' ? 'Критический' :
            name === 'high' ? 'Высокий' :
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

    // Recent projects are shared with every authenticated user.
    const [recentProjectsData, employeesData] = await Promise.all([
      prisma.project.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          customer: true,
          status: true,
          priority: true,
          _count: { select: { Task: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.user.findMany({
        where: { status: 'active', isBlocked: false, email: { not: ADMIN_EMAIL } },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const responsibleUserIdFrom = (customFields: unknown) => {
      if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return null;
      const value = (customFields as Record<string, unknown>).__responsibleUserId;
      return typeof value === 'string' ? value : null;
    };
    const isAssignedTo = (
      employee: { id: string; name: string },
      item: { responsible: string | null; engineer: string | null; customFields: unknown },
    ) => responsibleUserIdFrom(item.customFields) === employee.id
      || item.responsible === employee.name
      || item.engineer === employee.name;
    const isOverdue = (deadline: string, status: string) => {
      if (!deadline || status === 'done') return false;
      const timestamp = new Date(`${deadline}T23:59:59`).getTime();
      return Number.isFinite(timestamp) && timestamp < Date.now();
    };

    const employeeStats = employeesData.map(employee => {
      const assignedProjects = allProjects.filter(project => isAssignedTo(employee, project));
      const assignedTasks = allProjects.flatMap(project =>
        project.Task.filter(task => isAssignedTo(employee, task))
      );
      const completedTasks = assignedTasks.filter(task => task.status === 'done').length;

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        projectsCount: assignedProjects.length,
        activeProjects: assignedProjects.filter(project => project.status !== 'done').length,
        completedProjects: assignedProjects.filter(project => project.status === 'done').length,
        tasksCount: assignedTasks.length,
        activeTasks: assignedTasks.length - completedTasks,
        completedTasks,
        overdueTasks: assignedTasks.filter(task => isOverdue(task.deadline, task.status)).length,
        completionRate: assignedTasks.length > 0 ? (completedTasks / assignedTasks.length) * 100 : 0,
      };
    });
    const allTasks = allProjects.flatMap(project => project.Task);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.status === 'done').length;
    const overdueTasks = allTasks.filter(task => isOverdue(task.deadline, task.status)).length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const taskStatusLabels: Record<string, string> = {
      not_started: 'Не начаты',
      new: 'Новые',
      progress: 'В работе',
      review: 'На проверке',
      blocked: 'Заморожены',
      waiting: 'Ожидают',
      done: 'Выполнены',
    };
    const taskStatusColors: Record<string, string> = {
      not_started: '#94A3B8', new: '#94A3B8', progress: '#3B82F6', review: '#F59E0B',
      blocked: '#0EA5E9', waiting: '#F59E0B', done: '#10B981',
    };
    const projectStats = allProjects.map(project => {
      const projectCompletedTasks = project.Task.filter(task => task.status === 'done').length;
      const statusCounts = project.Task.reduce((counts, task) => {
        counts[task.status] = (counts[task.status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        deadline: project.deadline,
        responsible: project.responsible,
        engineer: project.engineer,
        totalTasks: project.Task.length,
        completedTasks: projectCompletedTasks,
        activeTasks: project.Task.length - projectCompletedTasks,
        overdueTasks: project.Task.filter(task => isOverdue(task.deadline, task.status)).length,
        highPriorityTasks: project.Task.filter(task => task.priority === 'critical' || task.priority === 'high').length,
        completionRate: project.Task.length > 0 ? (projectCompletedTasks / project.Task.length) * 100 : 0,
        tasksByStatus: Object.entries(statusCounts).map(([status, value]) => ({
          name: taskStatusLabels[status] || status,
          value,
          color: taskStatusColors[status] || '#64748B',
        })),
      };
    });

    const recentProjects = recentProjectsData.map((project) => ({
      id: project.id,
      name: project.name,
      customer: project.customer,
      status: project.status,
      priority: project.priority,
      tasksCount: project._count.Task,
    }));

    return NextResponse.json({
      totalProjects,
      activeProjects,
      completedProjects,
      overdueProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      taskCompletionRate,
      projectsByStatus,
      projectsByPriority,
      projectsByMonth,
      completionRate,
      recentProjects,
      employeeStats,
      projectStats,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'stack' in error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
