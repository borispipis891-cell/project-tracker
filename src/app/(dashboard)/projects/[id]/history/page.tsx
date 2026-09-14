'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClockIcon, ArrowLeftIcon } from '@heroicons/react/outline';
import { HistoryEntryCard } from '@/components/HistoryEntryCard';

interface HistoryEntry {
  id: number;
  date: string;
  user: string;
  action: string;
  details: string;
  createdAt: string;
}

export default function ProjectHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [projectId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);

      if (!res.ok) {
        throw new Error('Failed to fetch project');
      }

      const project = await res.json();
      setHistory(project.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Назад к проекту
        </button>
        <h1 className="text-2xl font-bold text-gray-900">История изменений</h1>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ClockIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">История изменений пуста</p>
        </div>
      ) : (
        <div>
          {history.map((entry) => (
            <HistoryEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
