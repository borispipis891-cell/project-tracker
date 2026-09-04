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

    // Calculate task metrics
    const now = new Date();
    const tasks = project.Task || [];
    const tasksWithMetrics = tasks.map((task) => {
      const createdAt = new Date(task.createdAt);
      const updatedAt = new Date(task.updatedAt);
      const completedAt = task.completedAt ? new Date(task.completedAt) : null;

      // Time spent in days
      const timeSpent = completedAt
        ? (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        : (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        stage: getStageFromStatus(task.status),
        assignee: task.responsible || task.engineer,
        timeSpent: Math.round(timeSpent * 10) / 10,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      };
    });

    // Group by stage
    const tasksByStage = tasksWithMetrics.reduce((acc, task) => {
      if (!acc[task.stage]) {
        acc[task.stage] = [];
      }
      acc[task.stage].push(task);
      return acc;
    }, {} as Record<string, typeof tasksWithMetrics>);

    // Calculate stage statistics
    const stageStats = Object.entries(tasksByStage).map(([stage, tasks]) => {
      const avgTime = tasks.reduce((sum, task) => sum + task.timeSpent, 0) / tasks.length;
      const stuckCount = tasks.filter(t => t.timeSpent > 7 && t.status !== 'done').length;

      return {
        stage,
        avgTime: Math.round(avgTime * 10) / 10,
        taskCount: tasks.length,
        stuckCount,
      };
    });

    // Time by stage for chart
    const timeByStage = stageStats.map(s => ({
      stage: s.stage,
      time: s.avgTime,
    }));

    // Tasks by status for pie chart
    const statusCounts = tasksWithMetrics.reduce((acc, task) => {
      const label = getStatusLabel(task.status);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      color: getStatusColor(name),
    }));

    // Overall metrics
    const totalTasks = tasksWithMetrics.length;
    const completedTasks = tasksWithMetrics.filter(t => t.status === 'done').length;
    const completedTasksData = tasksWithMetrics.filter(t => t.completedAt);

    const avgCompletionTime = completedTasksData.length > 0
      ? completedTasksData.reduce((sum, task) => sum + task.timeSpent, 0) / completedTasksData.length
      : 0;

    // Find bottleneck (stage with most stuck tasks or highest avg time)
    const bottleneck = stageStats
      .filter(s => s.stage !== 'Завершено')
      .sort((a, b) => b.stuckCount - a.stuckCount || b.avgTime - a.avgTime)[0];

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      totalTasks,
      completedTasks,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      bottleneckStage: bottleneck?.stuckCount > 0 ? bottleneck.stage : null,
      tasks: tasksWithMetrics,
      stageStats,
      tasksByStatus,
      timeByStage,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function getStageFromStatus(status: string): string {
  const stageMap: Record<string, string> = {
    'new': 'Новая',
    'todo': 'К выполнению',
    'in_progress': 'В работе',
    'progress': 'В работе',
    'review': 'На проверке',
    'testing': 'Тестирование',
    'done': 'Завершено',
    'blocked': 'Заблокировано',
    'waiting': 'Ожидание',
  };
  return stageMap[status] || status;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'new': 'Новая',
    'todo': 'К выполнению',
    'in_progress': 'В работе',
    'progress': 'В работе',
    'review': 'На проверке',
    'testing': 'Тестирование',
    'done': 'Завершено',
    'blocked': 'Заблокировано',
    'waiting': 'Ожидание',
  };
  return labels[status] || status;
}

function getStatusColor(statusLabel: string): string {
  const colors: Record<string, string> = {
    'Новая': '#6B7280',
    'К выполнению': '#6B7280',
    'В работе': '#3B82F6',
    'На проверке': '#F59E0B',
    'Тестирование': '#8B5CF6',
    'Завершено': '#10B981',
    'Заблокировано': '#EF4444',
    'Ожидание': '#F59E0B',
  };
  return colors[statusLabel] || '#6B7280';
}
