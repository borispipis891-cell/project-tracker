'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ADMIN_EMAIL } from '@/lib/admin';

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  isBlocked: boolean;
  createdAt: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  expiresAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!response.ok) throw new Error('Не удалось загрузить пользователей');
      const data = await response.json();
      setUsers(data.users);
      setInvitations(data.invitations);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const inviteUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim().toLowerCase();
    if (!name || !email) return;

    setSending(true);
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось отправить приглашение');
      setShowInviteForm(false);
      await loadUsers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось отправить приглашение');
    } finally {
      setSending(false);
    }
  };

  const renameUser = async (user: RegisteredUser) => {
    const name = prompt('Новое имя пользователя:', user.name)?.trim();
    if (!name || name === user.name) return;
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error || 'Не удалось переименовать пользователя');
    await loadUsers();
  };

  const deleteUser = async (user: RegisteredUser) => {
    if (!confirm(`Удалить пользователя ${user.name} (${user.email})? Проекты пользователя сохранятся.`)) return;
    const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) return alert(data.error || 'Не удалось удалить пользователя');
    await loadUsers();
  };

  const testEmail = async () => {
    setTestingEmail(true);
    try {
      const response = await fetch('/api/admin/email-test', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка отправки');
      alert(`Тестовое письмо отправлено на ${data.email}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка отправки');
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
          <p className="mt-1 text-sm text-gray-500">Все зарегистрированные аккаунты системы</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={testEmail} disabled={testingEmail} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            {testingEmail ? 'Проверка...' : 'Проверить email'}
          </button>
          <button onClick={() => setShowInviteForm(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Пригласить пользователя
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="border-b px-5 py-4 font-semibold">Зарегистрированные ({users.length})</div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Загрузка...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Зарегистрированных пользователей пока нет</div>
        ) : (
          <div className="divide-y">
            {users.map(user => (
              <div key={user.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className={`rounded-full px-2 py-1 ${user.isBlocked ? 'bg-sky-100 text-sky-700' : 'bg-green-100 text-green-700'}`}>
                    {user.isBlocked ? '❄️ Заморожен' : 'Активен'}
                  </span>
                  <span className="text-gray-500">{user.email.toLowerCase() === ADMIN_EMAIL ? 'Администратор' : 'Пользователь'}</span>
                  <span className="text-gray-400">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</span>
                  <button onClick={() => renameUser(user)} className="rounded border px-2 py-1 text-gray-600 hover:bg-gray-50">Переименовать</button>
                  {user.email.toLowerCase() !== ADMIN_EMAIL && (
                    <button onClick={() => deleteUser(user)} className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50">Удалить</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="border-b px-5 py-4 font-semibold">Ожидают регистрации ({invitations.length})</div>
        {invitations.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Активных приглашений нет</div>
        ) : (
          <div className="divide-y">
            {invitations.map(invitation => (
              <div key={invitation.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm text-gray-700">{invitation.email}</span>
                <span className="text-xs text-gray-400">до {new Date(invitation.expiresAt).toLocaleDateString('ru-RU')}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 p-5" onClick={() => setShowInviteForm(false)}>
          <form className="w-full max-w-md rounded-lg bg-white p-6" onSubmit={inviteUser} onClick={event => event.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">Пригласить пользователя</h2>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Имя
              <input name="name" required className="mt-1 w-full rounded-md border px-3 py-2 font-normal" />
            </label>
            <label className="mb-5 block text-sm font-medium text-gray-700">
              Email
              <input name="email" type="email" required className="mt-1 w-full rounded-md border px-3 py-2 font-normal" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowInviteForm(false)} className="rounded-md border px-4 py-2 text-sm">Отмена</button>
              <button disabled={sending} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {sending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
