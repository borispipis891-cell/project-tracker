'use client';

import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Calendar, Settings, LogOut, Users, User, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data || !data.user) {
          window.location.href = '/login';
        } else {
          setSession(data);
        }
        setLoading(false);
      });
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Дашборд' },
    { href: '/projects', icon: FolderKanban, label: 'Проекты' },
    { href: '/calendar', icon: Calendar, label: 'Календарь' },
    { href: '/profile', icon: User, label: 'Профиль' },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-600" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>

              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Project Tracker</span>
              </Link>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-sm text-gray-700 hidden sm:block truncate max-w-[150px]">
                {session.user?.name || session.user?.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-gray-600 hover:text-gray-900 transition p-2"
                title="Выйти"
              >
                <LogOut className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:block bg-white shadow-sm h-[calc(100vh-4rem)] border-r fixed left-0 top-16 overflow-visible transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          {/* Collapse/Expand Button */}
          <div className="absolute right-0 top-4 transform translate-x-1/2 z-50">
            <button
              onClick={toggleSidebar}
              className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-md"
              title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-3 h-3 text-gray-600" />
              ) : (
                <ChevronLeft className="w-3 h-3 text-gray-600" />
              )}
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}

            {/* Admin section */}
            {session.user?.role === 'admin' && (
              <>
                {!sidebarCollapsed && (
                  <div className="pt-4 pb-2">
                    <div className="px-4 text-xs font-semibold text-gray-500 uppercase">
                      Администрирование
                    </div>
                  </div>
                )}

                <Link
                  href="/admin"
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition ${
                    isActive('/admin')
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={sidebarCollapsed ? 'Пользователи' : undefined}
                >
                  <Users className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Пользователи</span>}
                </Link>
              </>
            )}

            <div className="pt-4">
              <Link
                href="/settings"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition ${
                  isActive('/settings')
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={sidebarCollapsed ? 'Настройки' : undefined}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>Настройки</span>}
              </Link>
            </div>
          </nav>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[60] top-16"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`lg:hidden fixed left-0 top-16 bottom-0 w-64 bg-white shadow-lg z-[70] transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Admin section */}
            {session.user?.role === 'admin' && (
              <>
                <div className="pt-4 pb-2">
                  <div className="px-4 text-xs font-semibold text-gray-500 uppercase">
                    Администрирование
                  </div>
                </div>

                <Link
                  href="/admin"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    isActive('/admin')
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Пользователи</span>
                </Link>
              </>
            )}

            <div className="pt-4">
              <Link
                href="/settings"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  isActive('/settings')
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Настройки</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
}
