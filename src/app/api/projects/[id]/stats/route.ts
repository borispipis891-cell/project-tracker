import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);

    // Get project with tasks
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        Task: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate task duration and status time
    const tasksWithMetrics = project.Task.map((task) => {
      const createdAt = new Date(task.createdAt);
      const updatedAt = new Date(task.updatedAt);
      const completedAt = task.completedAt ? new Date(task.completedAt) : null;

      // Total time in current status (hours)
      const timeInCurrentStatus = (new Date().getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

      // Total task lifetime (hours)
      const totalLifetime = completedAt
        ? (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
        : (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Days in current status
      const daysInStatus = Math.floor(timeInCurrentStatus / 24);

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        assignee: task.responsible || task.engineer,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
        timeInCurrentStatus: Math.round(timeInCurrentStatus * 10) / 10,
        totalLifetime: Math.round(totalLifetime * 10) / 10,
        daysInStatus,
        isStuck: daysInStatus > 7 && task.status !== 'done', // Stuck if > 7 days in same status
      };
    });

    // Group by status for time analysis
    const tasksByStatus = tasksWithMetrics.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {} as Record<string, typeof tasksWithMetrics>);

    // Calculate average time per status
    const statusMetrics = Object.entries(tasksByStatus).map(([status, tasks]) => {
      const avgTime = tasks.reduce((sum, task) => sum + task.timeInCurrentStatus, 0) / tasks.length;
      const maxTime = Math.max(...tasks.map((t) => t.timeInCurrentStatus));
      const count = tasks.length;

      const statusName =
        status === 'todo' ? 'К выполнению' :
        status === 'in_progress' ? 'В работе' :
        status === 'review' ? 'На проверке' :
        status === 'testing' ? 'Тестирование' :
        status === 'done' ? 'Завершено' :
        status === 'blocked' ? 'Заблокировано' : status;

      return {
        status: statusName,
        statusKey: status,
        avgTime: Math.round(avgTime * 10) / 10,
        maxTime: Math.round(maxTime * 10) / 10,
        count,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          timeInStatus: t.timeInCurrentStatus,
          daysInStatus: t.daysInStatus,
        })),
      };
    });

    // Identify bottlenecks (statuses where tasks spend most time)
    const bottlenecks = statusMetrics
      .filter((sm) => sm.statusKey !== 'done')
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 3);

    // Stuck tasks (in same status > 7 days)
    const stuckTasks = tasksWithMetrics.filter((t) => t.isStuck);

    // Task completion timeline (for line chart)
    const completedTasks = tasksWithMetrics
      .filter((t) => t.completedAt)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    const completionTimeline = completedTasks.map((task, index) => ({
      taskNumber: index + 1,
      taskTitle: task.title.length > 30 ? task.title.substring(0, 30) + '...' : task.title,
      duration: task.totalLifetime,
      completedDate: task.completedAt,
    }));

    // Overall project metrics
    const totalTasks = tasksWithMetrics.length;
    const completedTasksCount = tasksWithMetrics.filter((t) => t.status === 'done').length;
    const inProgressCount = tasksWithMetrics.filter((t) => t.status === 'in_progress').length;
    const blockedCount = tasksWithMetrics.filter((t) => t.status === 'blocked').length;
    const completionRate = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;

    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => sum + task.totalLifetime, 0) / completedTasks.length
      : 0;

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
      },
      metrics: {
        totalTasks,
        completedTasksCount,
        inProgressCount,
        blockedCount,
        stuckTasksCount: stuckTasks.length,
        completionRate: Math.round(completionRate * 10) / 10,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      },
      statusMetrics,
      bottlenecks,
      stuckTasks: stuckTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignee: t.assignee,
        daysInStatus: t.daysInStatus,
        timeInCurrentStatus: t.timeInCurrentStatus,
      })),
      completionTimeline,
      allTasks: tasksWithMetrics.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignee: t.assignee,
        timeInCurrentStatus: t.timeInCurrentStatus,
        totalLifetime: t.totalLifetime,
        daysInStatus: t.daysInStatus,
        isStuck: t.isStuck,
      })),
    });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project statistics' },
      { status: 500 }
    );
  }
}
