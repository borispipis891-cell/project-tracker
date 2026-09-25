'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Inbox, Mail, Paperclip, RefreshCw, Save, Sparkles, X } from 'lucide-react';

type DraftStatus = 'pending' | 'error' | 'approved' | 'rejected' | 'approving';

interface EmailDraft {
  id: string;
  senderName?: string | null;
  senderEmail: string;
  subject: string;
  bodyText: string;
  attachmentNames: string[];
  emailReceivedAt: string;
  status: DraftStatus;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  receivedAt: string;
  deadline: string;
  projectId: number | null;
  responsible: string | null;
  responsibleId: string | null;
  confidence: number;
  agentNote: string;
  errorMessage?: string | null;
  createdTaskId?: number | null;
}

interface ProjectOption { id: number; name: string; status: string }
interface UserOption { id: string; name: string; email: string }

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

const statusLabels: Record<DraftStatus, string> = {
  pending: 'На подтверждении',
  error: 'Нужна проверка',
  approved: 'Задача создана',
  rejected: 'Отклонён',
  approving: 'Создаётся',
};

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function EmailDraftsPage() {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<'review' | 'approved' | 'rejected' | 'all'>('review');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/email-drafts', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Не удалось загрузить черновики');
    setDrafts(data.drafts);
    setProjects(data.projects);
    setUsers(data.users);
    setPendingCount(data.pendingCount);
  }, []);

  useEffect(() => {
    load()
      .catch(error => setNotice({ type: 'error', text: error.message }))
      .finally(() => setLoading(false));
  }, [load]);

  const visibleDrafts = useMemo(() => drafts.filter(draft => {
    if (filter === 'review') return draft.status === 'pending' || draft.status === 'error' || draft.status === 'approving';
    if (filter === 'all') return true;
    return draft.status === filter;
  }), [drafts, filter]);

  const changeDraft = (id: string, patch: Partial<EmailDraft>) => {
    setDrafts(current => current.map(draft => draft.id === id ? { ...draft, ...patch } : draft));
  };

  const updateRequest = async (draft: EmailDraft, action: 'update' | 'approve' | 'reject') => {
    const body = action === 'update' ? {
      action,
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      receivedAt: draft.receivedAt,
      deadline: draft.deadline,
      projectId: draft.projectId,
      responsibleId: draft.responsibleId,
    } : { action };
    const response = await fetch(`/api/email-drafts/${draft.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Операция не выполнена');
    return data;
  };

  const saveDraft = async (draft: EmailDraft) => {
    setBusyId(draft.id);
    setNotice(null);
    try {
      const updated = await updateRequest(draft, 'update');
      changeDraft(draft.id, updated);
      setNotice({ type: 'success', text: 'Черновик сохранён' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Не удалось сохранить' });
    } finally {
      setBusyId(null);
    }
  };

  const approveDraft = async (draft: EmailDraft) => {
    if (!draft.projectId) {
      setNotice({ type: 'error', text: 'Сначала выберите проект' });
      return;
    }
    setBusyId(draft.id);
    setNotice(null);
    try {
      await updateRequest(draft, 'update');
      const result = await updateRequest({ ...draft, status: 'pending' }, 'approve');
      changeDraft(draft.id, { status: 'approved', createdTaskId: result.task.id });
      setPendingCount(count => Math.max(0, count - 1));
      setNotice({ type: 'success', text: `Задача «${draft.title}» создана` });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Не удалось создать задачу' });
    } finally {
      setBusyId(null);
    }
  };

  const rejectDraft = async (draft: EmailDraft) => {
    setBusyId(draft.id);
    setNotice(null);
    try {
      await updateRequest(draft, 'reject');
      changeDraft(draft.id, { status: 'rejected' });
      setPendingCount(count => Math.max(0, count - 1));
      setNotice({ type: 'success', text: 'Письмо отклонено' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Не удалось отклонить письмо' });
    } finally {
      setBusyId(null);
    }
  };

  const syncMailbox = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const response = await fetch('/api/email-drafts/sync', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось проверить почту');
      await load();
      setNotice({
        type: 'success',
        text: data.created ? `Добавлено черновиков: ${data.created}` : 'Новых писем для задач нет',
      });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Не удалось проверить почту' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-gray-500">Загрузка почтовых черновиков…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <Sparkles className="h-4 w-4" /> ИИ-агент Claude
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Почтовые черновики</h1>
          <p className="mt-1 text-sm text-gray-500">Агент разбирает входящие письма, но задача создаётся только после вашего подтверждения.</p>
        </div>
        <button
          type="button"
          onClick={syncMailbox}
          disabled={syncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Проверяю почту…' : 'Проверить почту'}
        </button>
      </header>

      {notice && (
        <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
          {notice.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {([
          ['review', `На проверке${pendingCount ? ` · ${pendingCount}` : ''}`],
          ['approved', 'Созданные'],
          ['rejected', 'Отклонённые'],
          ['all', 'Все'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleDrafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <Inbox className="mx-auto h-10 w-10 text-gray-300" />
          <h2 className="mt-3 font-semibold text-gray-800">Здесь пока пусто</h2>
          <p className="mt-1 text-sm text-gray-500">Отправьте письмо на ящик задачника и нажмите «Проверить почту».</p>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleDrafts.map(draft => {
            const editable = draft.status === 'pending' || draft.status === 'error';
            const confidence = Math.round(draft.confidence * 100);
            return (
              <article key={draft.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{draft.senderName ? `${draft.senderName} · ` : ''}{draft.senderEmail}</span>
                        <span>·</span>
                        <time>{new Date(draft.emailReceivedAt).toLocaleString('ru-RU')}</time>
                      </div>
                      <div className="mt-2 truncate font-medium text-gray-900">{draft.subject}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${draft.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : draft.status === 'rejected' ? 'bg-gray-200 text-gray-600' : draft.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {statusLabels[draft.status]}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-[1.25fr_0.75fr]">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Название задачи</label>
                      <input className={inputClass} value={draft.title} disabled={!editable} onChange={event => changeDraft(draft.id, { title: event.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Описание</label>
                      <textarea className={`${inputClass} min-h-32 resize-y`} value={draft.description} disabled={!editable} onChange={event => changeDraft(draft.id, { description: event.target.value })} />
                    </div>
                    <details className="rounded-lg border border-gray-200 bg-gray-50">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700">Показать исходное письмо</summary>
                      <div className="border-t border-gray-200 px-4 py-3 text-sm whitespace-pre-wrap text-gray-600">{draft.bodyText}</div>
                    </details>
                    {draft.attachmentNames.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {draft.attachmentNames.map((name, index) => (
                          <span key={`${name}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                            <Paperclip className="h-3 w-3" /> {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Проект</label>
                      <select className={inputClass} value={draft.projectId || ''} disabled={!editable} onChange={event => changeDraft(draft.id, { projectId: event.target.value ? Number(event.target.value) : null })}>
                        <option value="">Выберите проект</option>
                        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Исполнитель</label>
                      <select className={inputClass} value={draft.responsibleId || ''} disabled={!editable} onChange={event => changeDraft(draft.id, { responsibleId: event.target.value || null })}>
                        <option value="">Не назначен</option>
                        {users.map(user => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Приоритет</label>
                        <select className={inputClass} value={draft.priority} disabled={!editable} onChange={event => changeDraft(draft.id, { priority: event.target.value as EmailDraft['priority'] })}>
                          {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Получена</label>
                        <input type="date" className={inputClass} value={draft.receivedAt} disabled={!editable} onChange={event => changeDraft(draft.id, { receivedAt: event.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Срок</label>
                      <input type="date" className={inputClass} value={draft.deadline} disabled={!editable} onChange={event => changeDraft(draft.id, { deadline: event.target.value })} />
                    </div>

                    {(draft.agentNote || draft.errorMessage) && (
                      <div className={`rounded-lg border p-3 text-sm ${draft.errorMessage ? 'border-red-200 bg-red-50 text-red-700' : 'border-violet-200 bg-violet-50 text-violet-700'}`}>
                        <div className="font-semibold">{draft.errorMessage ? 'Агенту нужна помощь' : `Уверенность агента: ${confidence}%`}</div>
                        <div className="mt-1 text-xs leading-relaxed">{draft.errorMessage || draft.agentNote}</div>
                      </div>
                    )}

                    {editable && (
                      <div className="grid gap-2 pt-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                        <button type="button" disabled={busyId === draft.id} onClick={() => saveDraft(draft)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
                          <Save className="h-4 w-4" /> Сохранить
                        </button>
                        <button type="button" disabled={busyId === draft.id} onClick={() => rejectDraft(draft)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                          <X className="h-4 w-4" /> Отклонить
                        </button>
                        <button type="button" disabled={busyId === draft.id} onClick={() => approveDraft(draft)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
                          <Check className="h-4 w-4" /> Создать
                        </button>
                      </div>
                    )}

                    {draft.status === 'approved' && draft.projectId && (
                      <Link href={`/projects?project=${draft.projectId}`} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                        Открыть созданную задачу →
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
