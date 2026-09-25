'use client';

import { Banknote, Clock3, CloudSun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface SidebarInfoResponse {
  rates: {
    CNY: number;
    USD: number;
    EUR: number;
    effectiveDate: string | null;
  } | null;
  weather: {
    temperature: number;
    apparentTemperature: number;
    weatherCode: number;
  } | null;
}

const timeFormatters = {
  moscow: new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }),
  shanghai: new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }),
};

const rateFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getWeatherLabel(code: number) {
  if (code === 0) return 'Ясно';
  if (code <= 3) return 'Облачно';
  if (code === 45 || code === 48) return 'Туман';
  if (code >= 51 && code <= 57) return 'Морось';
  if (code >= 61 && code <= 67) return 'Дождь';
  if (code >= 71 && code <= 77) return 'Снег';
  if (code >= 80 && code <= 82) return 'Ливень';
  if (code >= 85 && code <= 86) return 'Снегопад';
  if (code >= 95) return 'Гроза';
  return 'Переменная облачность';
}

export function SidebarInfo() {
  const [now, setNow] = useState<Date | null>(null);
  const [info, setInfo] = useState<SidebarInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInfo = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/sidebar-info', { signal });
      if (!response.ok) throw new Error('Sidebar information is unavailable');
      setInfo(await response.json());
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setInfo(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    const clockTimer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadInfo(controller.signal);
    const refreshTimer = window.setInterval(() => loadInfo(), 15 * 60_000);

    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, [loadInfo]);

  return (
    <section className="mt-4 space-y-2 border-t border-gray-200 pt-4" aria-label="Полезная информация">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Banknote className="h-4 w-4" />
          Курсы к рублю
        </div>
        {info?.rates ? (
          <div className="space-y-1 text-sm text-gray-700">
            {(['CNY', 'USD', 'EUR'] as const).map((code) => (
              <div key={code} className="flex items-center justify-between gap-3">
                <span>{code}</span>
                <span className="font-semibold tabular-nums">{rateFormatter.format(info.rates![code])} ₽</span>
              </div>
            ))}
            {info.rates.effectiveDate && (
              <div className="pt-1 text-[12px] text-gray-500">ЦБ РФ · {info.rates.effectiveDate}</div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">{loading ? 'Загрузка…' : 'Временно недоступно'}</div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Clock3 className="h-4 w-4" />
          Время
        </div>
        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex items-center justify-between gap-3">
            <span>Москва</span>
            <time className="font-semibold tabular-nums">{now ? timeFormatters.moscow.format(now) : '—:—'}</time>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Шанхай</span>
            <time className="font-semibold tabular-nums">{now ? timeFormatters.shanghai.format(now) : '—:—'}</time>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5" aria-live="polite">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <CloudSun className="h-4 w-4" />
          Погода в Москве
        </div>
        {info?.weather ? (
          <div className="flex items-end justify-between gap-3 text-gray-700">
            <div>
              <div className="text-lg font-semibold tabular-nums">{Math.round(info.weather.temperature)} °C</div>
              <div className="text-[12px] text-gray-500">Ощущается {Math.round(info.weather.apparentTemperature)} °C</div>
            </div>
            <div className="pb-0.5 text-right text-sm">{getWeatherLabel(info.weather.weatherCode)}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">{loading ? 'Загрузка…' : 'Временно недоступно'}</div>
        )}
      </div>
    </section>
  );
}
