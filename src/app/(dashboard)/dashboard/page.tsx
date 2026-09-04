'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { FolderKanban, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  totalTasks: number;
  projectsByStatus: { name: string; value: number; color: string }[];
  projectsByPriority: { name: string; value: number }[];
  projectsByMonth: { month: string; count: number }[];
  completionRate: number;
  recentProjects: {
    id: number;
    name: string;
    customer: string;
    status: string;
    priority: string;
    tasksCount: number;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Дашборд</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Всего проектов</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProjects}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Активные</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{stats.activeProjects}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Завершенные</div>
              <div className="text-3xl font-bold text-green-600 mt-2">{stats.completedProjects}</div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Просроченные</div>
              <div className="text-3xl font-bold text-red-600 mt-2">{stats.overdueProjects}</div>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="bg-white rounded-lg shadow p-6 border">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Процент выполнения проектов</h2>
        <div className="flex items-center">
          <div className="flex-1">
            <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
          <div className="ml-4 text-2xl font-bold text-gray-900">{stats.completionRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects by Status - Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6 border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Проекты по статусам</h2>
          {stats.projectsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.projectsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.projectsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Нет данных
            </div>
          )}
        </div>

        {/* Projects by Priority - Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6 border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Проекты по приоритету</h2>
          {stats.projectsByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.projectsByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Нет данных
            </div>
          )}
        </div>
      </div>

      {/* Projects by Month - Line Chart */}
      <div className="bg-white rounded-lg shadow p-6 border">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Динамика создания проектов</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.projectsByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Проектов" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Недавние проекты</h2>
          <Link
            href="/projects"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Все проекты →
          </Link>
        </div>

        <div className="divide-y">
          {stats.recentProjects.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <p className="mb-4">У вас пока нет проектов</p>
              <Link
                href="/projects"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Создать первый проект
              </Link>
            </div>
          ) : (
            stats.recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {project.customer} • {project.tasksCount} задач
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        project.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : project.status === 'active'
                          ? 'bg-blue-100 text-blue-700'
                          : project.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {project.status === 'completed'
                        ? 'Завершён'
                        : project.status === 'active'
                        ? 'Активный'
                        : project.status === 'cancelled'
                        ? 'Отменён'
                        : 'Ожидает'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        project.priority === 'high'
                          ? 'bg-red-600'
                          : project.priority === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                    />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
