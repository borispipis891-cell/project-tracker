interface HistoryEntryCardProps {
  entry: {
    date: string;
    user: string;
    action: string;
    details?: string;
    createdAt?: string;
  };
}

const VALUE_LABELS: Record<string, string> = {
  new: 'Новый',
  not_started: 'Не начата',
  progress: 'В работе',
  blocked: 'Заморожен',
  review: 'На проверке',
  waiting: 'Ожидание',
  done: 'Завершён',
  critical: 'Критический',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const humanize = (value: string) => value.replace(
  /\b(not_started|progress|blocked|review|waiting|done|critical|high|medium|low|new)\b/g,
  token => VALUE_LABELS[token] || token,
);

const detailLines = (details: string) => details
  .split(/,\s+(?=(?:название|статус|приоритет|дедлайн|ответственного|инженера|дату|заказчика|цвет|теги|описание|дополнительные))/i)
  .map(line => humanize(line.trim()))
  .filter(Boolean);

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value, time: '' };
  return {
    date: parsed.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  };
};

export function HistoryEntryCard({ entry }: HistoryEntryCardProps) {
  const timestamp = formatDate(entry.createdAt || entry.date);
  const isAdded = /добав|создан/i.test(entry.action);
  const isDeleted = /удал/i.test(entry.action);
  const tone = isDeleted
    ? { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' }
    : isAdded
      ? { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' }
      : { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' };
  const lines = entry.details ? detailLines(entry.details) : [];
  const arrowChange = lines.length === 1 && lines[0].includes(' → ')
    ? lines[0].split(' → ', 2)
    : null;

  return (
    <div className="relative pl-7 pb-5 last:pb-0">
      <span className={`absolute left-[5px] top-2 w-3 h-3 rounded-full ring-4 ring-white ${tone.dot}`} />
      <span className="absolute left-[10px] top-5 bottom-0 w-px bg-gray-200 last:hidden" />
      <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
              {entry.action}
            </span>
            <div className="mt-2 text-sm font-medium text-gray-900">{entry.user || 'Система'}</div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>{timestamp.date}</div>
            {timestamp.time && <div className="mt-0.5">{timestamp.time}</div>}
          </div>
        </div>

        {arrowChange ? (
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md bg-gray-50 p-3 text-sm">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Было</div>
              <div className="text-gray-700 break-words">{arrowChange[0] || '—'}</div>
            </div>
            <span className="text-gray-400">→</span>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Стало</div>
              <div className="font-medium text-gray-900 break-words">{arrowChange[1] || '—'}</div>
            </div>
          </div>
        ) : lines.length > 0 ? (
          <ul className="mt-3 space-y-1.5 rounded-md bg-gray-50 p-3">
            {lines.map((line, index) => (
              <li key={`${line}-${index}`} className="flex gap-2 text-sm text-gray-700">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gray-400" />
                <span className="break-words">{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </div>
  );
}
