'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ProjectStatus = 'new' | 'progress' | 'done' | 'blocked' | 'waiting';
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface Task {
  id: number;
  title: string;
  status: string;
  receivedAt: string;
  deadline: string;
  responsible?: string;
  engineer?: string;
  comments?: Array<{ author: string; date: string; text: string }>;
  customFields?: Record<string, string>;
}

interface Project {
  id: number;
  name: string;
  receivedAt: string;
  deadline: string;
  customer: string;
  pss: string;
  reg: string;
  status: ProjectStatus;
  priority: Priority;
  responsible: string;
  engineer: string;
  expanded: boolean;
  tasks: Task[];
  comments?: Array<{ author: string; date: string; text: string }>;
  customFields?: Record<string, string>;
}

const TODAY = new Date('2026-09-01T00:00:00');
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // September 2026
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    // Fetch projects from API
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(err => console.error('Failed to fetch projects:', err));
  }, []);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add empty cells for days before month starts (Monday as first day)
    const firstDayOfWeek = firstDay.getDay();
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = 0; i < offset; i++) {
      days.push(new Date(year, month, -offset + i + 1));
    }

    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Add empty cells to complete the grid
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getProjectsForDate = (date: Date): Project[] => {
    const dateKey = formatDateKey(date);
    return projects.filter(p => p.deadline === dateKey && p.status !== 'done');
  };

  const isToday = (date: Date): boolean => {
    const todayKey = formatDateKey(new Date(TODAY));
    return formatDateKey(date) === todayKey;
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isPast = (date: Date): boolean => {
    return date < new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  };

  const days = getDaysInMonth(currentDate);
  const selectedProjects = selectedDate ? projects.filter(p => p.deadline === selectedDate && p.status !== 'done') : [];

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-blue-50 border-b border-blue-200 text-blue-800 text-xs py-2 px-5 text-center">
        Календарь дедлайнов проектов
      </div>

      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 sticky top-0 z-20 flex items-center gap-3">
        <div className="font-bold text-blue-600 text-base">◆ Tracker</div>
        <Link href="/projects" className="text-gray-600 hover:text-gray-900 text-sm">Проекты</Link>
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm">Статистика</Link>
        <div className="font-semibold text-base">Календарь</div>
      </div>

      <div className="p-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Сегодня
                  </button>
                  <button
                    onClick={goToPreviousMonth}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    ←
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {DAYS_SHORT.map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {days.map((date, index) => {
                  const dateKey = formatDateKey(date);
                  const projectsOnDate = getProjectsForDate(date);
                  const isTodayDate = isToday(date);
                  const isCurrentMonthDate = isCurrentMonth(date);
                  const isPastDate = isPast(date);

                  return (
                    <div
                      key={index}
                      onClick={() => projectsOnDate.length > 0 && setSelectedDate(dateKey)}
                      className={`min-h-20 border border-gray-200 rounded p-1 ${
                        !isCurrentMonthDate ? 'bg-gray-50' : 'bg-white'
                      } ${
                        isTodayDate ? 'ring-2 ring-blue-600' : ''
                      } ${
                        projectsOnDate.length > 0 ? 'cursor-pointer hover:bg-blue-50' : ''
                      } ${
                        selectedDate === dateKey ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className={`text-xs font-medium mb-1 ${
                        !isCurrentMonthDate ? 'text-gray-400' :
                        isTodayDate ? 'text-blue-600' :
                        isPastDate ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {projectsOnDate.slice(0, 3).map(project => (
                          <div
                            key={project.id}
                            className={`text-[10px] px-1 py-0.5 rounded text-white truncate ${getPriorityColor(project.priority)}`}
                            title={project.name}
                          >
                            {project.name}
                          </div>
                        ))}
                        {projectsOnDate.length > 3 && (
                          <div className="text-[10px] text-gray-500 px-1">
                            +{projectsOnDate.length - 3} ещё
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Legend */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold mb-3">Приоритеты</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-600"></div>
                  <span>Критический</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500"></div>
                  <span>Высокий</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span>Средний</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-400"></div>
                  <span>Низкий</span>
                </div>
              </div>
            </div>

            {/* Selected Date Details */}
            {selectedDate && selectedProjects.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold mb-3">
                  Проекты на {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU')}
                </h3>
                <div className="space-y-3">
                  {selectedProjects.map(project => (
                    <div key={project.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-start gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${getPriorityColor(project.priority)}`}></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{project.name}</div>
                          <div className="text-xs text-gray-500">{project.customer}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Ответственный: {project.responsible}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
