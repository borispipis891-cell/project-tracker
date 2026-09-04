'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type UserRole = 'admin' | 'manager' | 'engineer' | 'viewer' | 'none';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canManageColumns: boolean;
    canViewAll: boolean;
  };
  createdAt: string;
  status: 'active' | 'pending' | 'blocked';
}

const CURRENT_USER = 'Борис'; // Admin user

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  engineer: 'Инженер',
  viewer: 'Наблюдатель',
  none: 'Нет прав'
};

const DEFAULT_PERMISSIONS: Record<UserRole, User['permissions']> = {
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    canManageColumns: true,
    canViewAll: true
  },
  manager: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canExport: true,
    canManageColumns: true,
    canViewAll: true
  },
  engineer: {
    canCreate: false,
    canEdit: true,
    canDelete: false,
    canExport: false,
    canManageColumns: false,
    canViewAll: false
  },
  viewer: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    canManageColumns: false,
    canViewAll: true
  },
  none: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    canManageColumns: false,
    canViewAll: false
  }
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState<User | null>(null);

  useEffect(() => {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      // Initialize with admin user
      const initialUsers: User[] = [
        {
          id: '1',
          name: 'Борис',
          email: 'boris@example.com',
          role: 'admin',
          permissions: DEFAULT_PERMISSIONS.admin,
          createdAt: new Date().toISOString(),
          status: 'active'
        }
      ];
      setUsers(initialUsers);
      localStorage.setItem('users', JSON.stringify(initialUsers));
    }
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('users', JSON.stringify(users));
    }
  }, [users]);

  const addUser = () => {
    const name = (document.getElementById('user_name') as HTMLInputElement).value.trim();
    const email = (document.getElementById('user_email') as HTMLInputElement).value.trim();

    if (!name || !email) {
      alert('Заполните все поля');
      return;
    }

    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, name, email } : u));
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        role: 'none',
        permissions: DEFAULT_PERMISSIONS.none,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      setUsers([...users, newUser]);
    }

    setShowModal(false);
    setEditingUser(null);
  };

  const changeUserRole = (userId: string, newRole: UserRole) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          role: newRole,
          permissions: DEFAULT_PERMISSIONS[newRole],
          status: newRole === 'none' ? 'pending' : 'active'
        };
      }
      return u;
    }));
  };

  const togglePermission = (userId: string, permission: keyof User['permissions']) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [permission]: !u.permissions[permission]
          }
        };
      }
      return u;
    }));
  };

  const deleteUser = (userId: string) => {
    if (!confirm('Удалить пользователя?')) return;
    setUsers(users.filter(u => u.id !== userId));
  };

  const blockUser = (userId: string) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === 'blocked' ? 'active' : 'blocked' as const };
      }
      return u;
    }));
  };

  const sendInvitation = async (user: User) => {
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.name }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      alert(`✅ Приглашение отправлено на ${user.email}`);
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('❌ Ошибка при отправке приглашения. Проверьте SMTP настройки.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-50 border-b border-blue-200 text-blue-800 text-xs py-2 px-4 sm:px-5 text-center">
        Панель администратора
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-5 py-3 sticky top-0 z-20 flex items-center gap-2 sm:gap-3 overflow-x-auto">
        <div className="font-bold text-blue-600 text-sm sm:text-base whitespace-nowrap">◆ Tracker</div>
        <Link href="/projects" className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm whitespace-nowrap">Проекты</Link>
        <div className="font-semibold text-sm sm:text-base whitespace-nowrap">Управление пользователями</div>
      </div>

      <div className="p-4 sm:p-5 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h1 className="text-base sm:text-lg font-semibold">Пользователи системы</h1>
            <button
              onClick={() => {
                setEditingUser(null);
                setShowModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              + Добавить пользователя
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Пользователь</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Роль</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Дата регистрации</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{user.name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => changeUserRole(user.id, e.target.value as UserRole)}
                        disabled={user.name === CURRENT_USER}
                        className="text-xs px-2 py-1 rounded border border-gray-300 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-700' :
                        user.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {user.status === 'active' ? 'Активен' :
                         user.status === 'pending' ? 'Ожидает' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sendInvitation(user)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title="Отправить приглашение на email"
                        >
                          📧
                        </button>
                        <button
                          onClick={() => setShowPermissionsModal(user)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title="Настроить права"
                        >
                          ⚙️
                        </button>
                        {user.name !== CURRENT_USER && (
                          <>
                            <button
                              onClick={() => blockUser(user.id)}
                              className="text-orange-600 hover:text-orange-800 text-sm"
                              title={user.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                            >
                              {user.status === 'blocked' ? '🔓' : '🔒'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowModal(true);
                              }}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                              title="Редактировать"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                              title="Удалить"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-45 flex items-center justify-center z-50 p-5"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">
              {editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
            </h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                <input
                  id="user_name"
                  type="text"
                  defaultValue={editingUser?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-600"
                  placeholder="Введите имя"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="user_email"
                  type="email"
                  defaultValue={editingUser?.email || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-600"
                  placeholder="email@example.com"
                />
              </div>
              {!editingUser && (
                <p className="text-xs text-gray-500">
                  Пользователь будет создан со статусом "Ожидает" и без прав доступа.
                  Назначьте роль после создания.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={addUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                {editingUser ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-45 flex items-center justify-center z-50 p-5"
          onClick={() => setShowPermissionsModal(null)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">
              Права доступа: {showPermissionsModal.name}
            </h2>
            <div className="space-y-3 mb-4">
              <div className="text-sm text-gray-600 mb-3">
                Роль: <span className="font-medium">{ROLE_LABELS[showPermissionsModal.role]}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPermissionsModal.permissions.canCreate}
                  onChange={() => togglePermission(showPermissionsModal.id, 'canCreate')}
                  className="rounded"
                />
                <span className="text-sm">Создание проектов</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPermissionsModal.permissions.canEdit}
                  onChange={() => togglePermission(showPermissionsModal.id, 'canEdit')}
                  className="rounded"
                />
                <span className="text-sm">Редактирование проектов</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPermissionsModal.permissions.canDelete}
                  onChange={() => togglePermission(showPermissionsModal.id, 'canDelete')}
                  className="rounded"
                />
                <span className="text-sm">Удаление проектов</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPermissionsModal.permissions.canExport}
                  onChange={() => togglePermission(showPermissionsModal.id, 'canExport')}
                  className="rounded"
                />
                <span className="text-sm">Экспорт данных</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPermissionsModal.permissions.canManageColumns}
                  onChange={() => togglePermission(showPermissionsModal.id, 'canManageColumns')}
                  className="rounded"
                />
                <span className="text-sm">Управление столбцами</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPermissionsModal.permissions.canViewAll}
                  onChange={() => togglePermission(showPermissionsModal.id, 'canViewAll')}
                  className="rounded"
                />
                <span className="text-sm">Просмотр всех проектов</span>
              </label>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowPermissionsModal(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
