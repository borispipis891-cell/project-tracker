'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, UserPlus } from 'lucide-react';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = searchParams.get('token');

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      // Перенаправляем на вход с возвратом на эту страницу
      router.push(`/login?callbackUrl=/accept-invite?token=${token}`);
      return;
    }

    if (!token) {
      setState('error');
      setMessage('Токен приглашения не указан');
      return;
    }

    async function acceptInvite() {
      try {
        const response = await fetch('/api/projects/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setState('success');
          setMessage(data.message || 'Приглашение принято!');
          setProjectId(data.project?.id);
          setProjectName(data.project?.name);

          // Redirect to project after 3 seconds
          setTimeout(() => {
            if (data.project?.id) {
              router.push(`/projects/${data.project.id}/team`);
            } else {
              router.push('/projects');
            }
          }, 3000);
        } else {
          setState('error');
          setMessage(data.error || 'Не удалось принять приглашение');
        }
      } catch (error) {
        setState('error');
        setMessage('Произошла ошибка при обработке приглашения');
      }
    }

    acceptInvite();
  }, [token, session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Загрузка...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {state === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Обработка приглашения...
              </h1>
              <p className="text-gray-600">
                Пожалуйста, подождите
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Приглашение принято!
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              {projectName && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-900 font-medium">
                      Вы добавлены в проект: {projectName}
                    </p>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-4">
                Перенаправление...
              </p>
              {projectId ? (
                <Link
                  href={`/projects/${projectId}/team`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Перейти к проекту
                </Link>
              ) : (
                <Link
                  href="/projects"
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  К списку проектов
                </Link>
              )}
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Ошибка
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-2">
                <Link
                  href="/projects"
                  className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center"
                >
                  К списку проектов
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
