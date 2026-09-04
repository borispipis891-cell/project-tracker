'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { ArrowLeft, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface TaskDuration {
  id: number;
  name: string;
  status: string;
  duration: number; // в днях
  stage: string;
  isOverdue: boolean;
}

interface StageStats {
  stage: string;
  avgDuration: number;
  taskCount: number;
  stuckTasks: number;
}

interface ProjectStats {
  projectName: string;
  tasksByDuration: TaskDuration[];
  stageStats: StageStats[];
  statusDistribution: { name: string; value: number; color: string }[];
  bottlenecks: {
    stage: string;
    avgDays: number;
    tasks: string[];
  }[];
  timeline: {
    date: string;
    created: number;
    completed: number;
    inProgress: number;
  }[];
}

const STAGE_COLORS = {
  'Новая': '#6B7280',
  'В работе': '#3B82F6',
  'На проверке': '#F59E0B',
  'Завершена': '#10B981',
  'Заблокирована': '#EF4444'
};

export default function ProjectStatsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchStats();
    }
  }, [projectId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching project stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Загрузка статистики...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Ошибка загрузки статистики</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Статистика проекта</h1>
            <p className="text-gray-600 mt-1">{stats.projectName}</p>
          </div>
        </div>
      </div>

      {/* Bottlenecks Alert */}
      {stats.bottlenecks.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Выявлены узкие места</h3>
              {stats.bottlenecks.map((bottleneck, idx) => (
                <div key={idx} className="mb-3 last:mb-0">
                  <p className="font-semibold text-red-800">
                    {bottleneck.stage} — среднее время: {bottleneck.avgDays.toFixed(1)} дней
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Застрявшие задачи: {bottleneck.tasks.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stage Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Производительность по этапам
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={stats.stageStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis label={{ value: 'Дни', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <p className="font-semibold">{data.stage}</p>
                      <p className="text-sm">Среднее время: {data.avgDuration.toFixed(1)} дней</p>
                      <p className="text-sm">Задач: {data.taskCount}</p>
                      <p className="text-sm text-red-600">Застрявших: {data.stuckTasks}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar dataKey="avgDuration" fill="#3B82F6" name="Среднее время (дни)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Task Duration Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Длительность задач
        </h2>
        <div className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={stats.tasksByDuration.slice(0, 20)}
              layout="vertical"
              margin={{ left: 150 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Дни', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as TaskDuration;
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm">Этап: {data.stage}</p>
                        <p className="text-sm">Длительность: {data.duration} дней</p>
                        <p className={`text-sm font-medium ${data.isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                          {data.isOverdue ? '⚠ Просрочена' : '✓ В сроке'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="duration"
                fill="#3B82F6"
                label={false}
              >
                {stats.tasksByDuration.slice(0, 20).map((task, index) => (
                  <Cell key={`cell-${index}`} fill={task.isOverdue ? '#EF4444' : '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {stats.tasksByDuration.length > 20 && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Показано 20 из {stats.tasksByDuration.length} задач
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Распределение по статусам</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Динамика выполнения</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#6B7280" name="Созданы" />
              <Line type="monotone" dataKey="inProgress" stroke="#3B82F6" name="В работе" />
              <Line type="monotone" dataKey="completed" stroke="#10B981" name="Завершены" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Детальная таблица</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Задача</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Этап</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Длительность</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.tasksByDuration.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{task.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{task.stage}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {task.duration} дней
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      task.status === 'blocked' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status === 'completed' ? 'Завершена' :
                       task.status === 'in_progress' ? 'В работе' :
                       task.status === 'blocked' ? 'Заблокирована' :
                       'Новая'}
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
