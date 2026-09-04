'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProjectNav } from '@/components/ProjectNav';
import { RoleBadge } from '@/components/RoleBadge';

interface Project {
  id: number;
  name: string;
  receivedAt: string;
  deadline: string;
  completedAt?: string;
  customer: string;
  pss: string;
  reg: string;
  status: string;
  priority: string;
  responsible: string;
  engineer: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  userRole?: 'owner' | 'editor' | 'viewer';
  canEdit?: boolean;
  canDelete?: boolean;
  tasks: Array<{
    id: number;
    title: string;
    status: string;
    deadline: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  progress: 'В работе',
  done: 'Завершён',
  blocked: 'Заблокирован',
  waiting: 'Ожидание'
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Критический',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий'
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.id as string);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);

      if (!response.ok) {
        if (response.status === 403) {
          setError('У вас нет доступа к этому проекту');
        } else if (response.status === 404) {
          setError('Проект не найден');
        } else {
          setError('Ошибка загрузки проекта');
        }
        return;
      }

      const data = await response.json();
      setProject(data);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Ошибка загрузки проекта');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      new: 'bg-gray-100 text-gray-700',
      progress: 'bg-blue-100 text-blue-700',
      done: 'bg-green-100 text-green-700',
      blocked: 'bg-red-100 text-red-700',
      waiting: 'bg-yellow-100 text-yellow-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      critical: 'text-red-600',
      high: 'text-orange-500',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-4">{error || 'Проект не найден'}</div>
          <Link href="/projects" className="text-blue-600 hover:underline">
            ← Вернуться к списку проектов
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Link href="/projects" className="text-gray-600 hover:text-gray-900 flex-shrink-0">
              ← Проекты
            </Link>
            <span className="text-gray-400 hidden sm:inline">/</span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{project.name}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {project.userRole && <RoleBadge role={project.userRole} />}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {STATUS_LABELS[project.status]}
            </span>
            <span className={`text-xs sm:text-sm font-medium ${getPriorityColor(project.priority)}`}>
              {PRIORITY_LABELS[project.priority]}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ProjectNav projectId={projectId} />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Main Info */}
          <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 mb-1">Заказчик</div>
                <div className="font-medium">{project.customer}</div>
              </div>

              <div>
                <div className="text-gray-500 mb-1">PSS</div>
                <div className="font-medium">{project.pss}</div>
              </div>

              <div>
                <div className="text-gray-500 mb-1">Номер регистрации</div>
                <div className="font-medium">{project.reg}</div>
              </div>

              <div>
                <div className="text-gray-500 mb-1">Ответственный</div>
                <div className="font-medium">{project.responsible}</div>
              </div>

              <div>
                <div className="text-gray-500 mb-1">Инженер</div>
                <div className="font-medium">{project.engineer}</div>
              </div>

              <div>
                <div className="text-gray-500 mb-1">Владелец</div>
                <div className="font-medium">{project.owner.name}</div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Даты</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Дата поступления</span>
                <span className="font-medium">{formatDate(project.receivedAt)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Дедлайн</span>
                <span className="font-medium">{formatDate(project.deadline)}</span>
              </div>

              {project.completedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Дата завершения</span>
                  <span className="font-medium">{formatDate(project.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg border p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Задачи ({project.tasks.length})
            </h2>

            {project.tasks.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                Нет задач
              </div>
            ) : (
              <div className="space-y-2">
                {project.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.deadline && (
                        <div className="text-xs text-gray-500 mt-1">
                          Дедлайн: {formatDate(task.deadline)}
                        </div>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
