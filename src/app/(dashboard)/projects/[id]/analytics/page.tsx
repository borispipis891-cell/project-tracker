'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface TaskAnalytics {
  id: number;
  title: string;
  status: string;
  timeSpent: number; // в днях
  stage: string;
  assignee: string | null;
}

interface StageAnalytics {
  stage: string;
  avgTime: number; // средняя продолжительность в днях
  taskCount: number;
  stuckCount: number; // количество зависших задач
}

interface ProjectAnalytics {
  projectId: number;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  avgCompletionTime: number;
  bottleneckStage: string | null;
  tasks: TaskAnalytics[];
  stageStats: StageAnalytics[];
  tasksByStatus: { name: string; value: number; color: string }[];
  timeByStage: { stage: string; time: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  'to-do': '#6B7280',
  'in-progress': '#3B82F6',
  'review': '#F59E0B',
  'done': '#10B981',
  'blocked': '#EF4444'
};

const STATUS_LABELS: Record<string, string> = {
  'to-do': 'К выполнению',
  'in-progress': 'В работе',
  'review': 'На проверке',
  'done': 'Завершено',
  'blocked': 'Заблокировано'
};

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [projectId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        console.error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Загрузка аналитики...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Ошибка загрузки аналитики</div>
      </div>
    );
  }

  const completionRate = analytics.totalTasks > 0
    ? (analytics.completedTasks / analytics.totalTasks) * 100
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="text-gray-600 hover:text-gray-900 transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Аналитика проекта</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">{analytics.projectName}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-medium text-gray-600 truncate">Всего задач</div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{analytics.totalTasks}</div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-medium text-gray-600 truncate">Завершено</div>
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">{analytics.completedTasks}</div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-medium text-gray-600 truncate">Среднее время</div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                {analytics.avgCompletionTime.toFixed(1)}д
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-medium text-gray-600 truncate">Узкое место</div>
              <div className="text-base sm:text-lg font-bold text-red-600 mt-1 sm:mt-2 truncate">
                {analytics.bottleneckStage || 'Нет'}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 border">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Прогресс выполнения</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="h-6 sm:h-8 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left sm:ml-4">{completionRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Time by Stage - Bar Chart */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
            Время по этапам <span className="text-xs sm:text-sm font-normal text-gray-600">(дни)</span>
          </h2>
          {analytics.timeByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <BarChart data={analytics.timeByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value} дней`} />
                <Bar dataKey="time" fill="#3B82F6" name="Среднее время" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-gray-500 text-sm">
              Нет данных
            </div>
          )}
        </div>

        {/* Tasks by Status - Pie Chart */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Задачи по статусам</h2>
          {analytics.tasksByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <PieChart>
                <Pie
                  data={analytics.tasksByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.tasksByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-gray-500 text-sm">
              Нет данных
            </div>
          )}
        </div>
      </div>

      {/* Stage Statistics */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Статистика по этапам</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Этап</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Задач</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Среднее время</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Зависло</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {analytics.stageStats.map((stage) => (
                <tr key={stage.stage} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900">{stage.stage}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600">{stage.taskCount}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600">{stage.avgTime.toFixed(1)} дней</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                    {stage.stuckCount > 0 ? (
                      <span className="text-red-600 font-medium">{stage.stuckCount}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                    {stage.stuckCount > 0 ? (
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Узкое место
                      </span>
                    ) : stage.avgTime > analytics.avgCompletionTime * 1.5 ? (
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Медленно
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Нормально
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tasks List with Time Spent */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Детализация по задачам</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Задача</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Этап</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Исполнитель</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {analytics.tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">{task.title}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600">{task.stage}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                    <span
                      className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: `${STATUS_COLORS[task.status]}20`,
                        color: STATUS_COLORS[task.status]
                      }}
                    >
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600 max-w-[120px] truncate">{task.assignee || '—'}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                    <span
                      className={`font-medium whitespace-nowrap ${
                        task.timeSpent > analytics.avgCompletionTime * 2
                          ? 'text-red-600'
                          : task.timeSpent > analytics.avgCompletionTime * 1.5
                          ? 'text-yellow-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {task.timeSpent.toFixed(1)} дней
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
