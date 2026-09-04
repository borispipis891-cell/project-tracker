'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Users, UserPlus, Mail, Shield, Trash2, Crown, Edit2 } from 'lucide-react';

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  addedAt: string;
}

interface Owner {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export default function ProjectTeamPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const projectId = parseInt(params.id);

  const [owner, setOwner] = useState<Owner | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    try {
      const response = await fetch(`/api/projects/members?projectId=${projectId}`);
      const data = await response.json();

      if (response.ok) {
        setOwner(data.owner);
        setMembers(data.members);
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка загрузки' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Произошла ошибка' });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setInviting(true);

    try {
      const response = await fetch('/api/projects/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          projectId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setInviteEmail('');
        loadMembers();

        // Показываем ссылку приглашения если пользователь не зарегистрирован
        if (data.inviteUrl) {
          console.log('Invite URL:', data.inviteUrl);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка приглашения' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Произошла ошибка' });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Удалить участника из проекта?')) return;

    try {
      const response = await fetch(`/api/projects/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Участник удалён' });
        loadMembers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка удаления' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Произошла ошибка' });
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch('/api/projects/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Роль обновлена' });
        loadMembers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка обновления' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Произошла ошибка' });
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      owner: 'bg-purple-100 text-purple-800',
      editor: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      owner: 'Владелец',
      editor: 'Редактор',
      viewer: 'Наблюдатель',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const isOwner = owner?.email === session?.user?.email;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Команда проекта</h1>
          <p className="text-gray-500">Управление доступом к проекту</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Invite Form (только для владельца) */}
      {isOwner && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Пригласить участника
          </h2>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Роль
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Наблюдатель</option>
                  <option value="editor">Редактор</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {inviting ? 'Отправка...' : 'Пригласить'}
            </button>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Участники ({members.length + 1})
          </h2>
        </div>

        <div className="divide-y">
          {/* Owner */}
          {owner && (
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{owner.name}</div>
                  <div className="text-sm text-gray-500">{owner.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getRoleBadge('owner')}
              </div>
            </div>
          )}

          {/* Members */}
          {members.map((member) => (
            <div key={member.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-500">{member.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isOwner ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="viewer">Наблюдатель</option>
                      <option value="editor">Редактор</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  getRoleBadge(member.role)
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              Пока нет других участников
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
