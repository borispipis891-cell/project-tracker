'use client';

import { Crown, Edit2, Eye } from 'lucide-react';

interface RoleBadgeProps {
  role: 'owner' | 'editor' | 'viewer';
  className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const config = {
    owner: {
      label: 'Владелец',
      icon: Crown,
      colors: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    editor: {
      label: 'Редактор',
      icon: Edit2,
      colors: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    viewer: {
      label: 'Наблюдатель',
      icon: Eye,
      colors: 'bg-gray-100 text-gray-800 border-gray-200',
    },
  };

  const { label, icon: Icon, colors } = config[role];

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${colors} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

interface ProjectRoleInfoProps {
  role: 'owner' | 'editor' | 'viewer';
  showPermissions?: boolean;
}

export function ProjectRoleInfo({ role, showPermissions = false }: ProjectRoleInfoProps) {
  const permissions = {
    owner: [
      'Полный доступ к проекту',
      'Управление командой',
      'Редактирование и удаление',
    ],
    editor: [
      'Просмотр проекта',
      'Редактирование данных',
      'Добавление комментариев',
    ],
    viewer: [
      'Просмотр проекта',
      'Чтение комментариев',
    ],
  };

  return (
    <div className="space-y-2">
      <RoleBadge role={role} />

      {showPermissions && (
        <div className="text-xs text-gray-600 space-y-1 mt-3">
          <div className="font-medium">Доступные действия:</div>
          <ul className="space-y-0.5">
            {permissions[role].map((perm, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{perm}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
