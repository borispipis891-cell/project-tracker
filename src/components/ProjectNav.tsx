'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, FileText, History, Paperclip, BarChart3 } from 'lucide-react';

interface ProjectNavProps {
  projectId: number;
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();

  const tabs = [
    {
      href: `/projects/${projectId}`,
      label: 'Детали',
      icon: FileText,
      match: (path: string) => path === `/projects/${projectId}`,
    },
    {
      href: `/projects/${projectId}/team`,
      label: 'Команда',
      icon: Users,
      match: (path: string) => path === `/projects/${projectId}/team`,
    },
    {
      href: `/projects/${projectId}/analytics`,
      label: 'Аналитика',
      icon: BarChart3,
      match: (path: string) => path === `/projects/${projectId}/analytics`,
    },
    {
      href: `/projects/${projectId}/history`,
      label: 'История',
      icon: History,
      match: (path: string) => path === `/projects/${projectId}/history`,
    },
    {
      href: `/projects/${projectId}/attachments`,
      label: 'Файлы',
      icon: Paperclip,
      match: (path: string) => path === `/projects/${projectId}/attachments`,
    },
  ];

  return (
    <div className="bg-white border-b overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.match(pathname);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 py-3 font-medium text-sm border-b-2 transition whitespace-nowrap
                  ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
