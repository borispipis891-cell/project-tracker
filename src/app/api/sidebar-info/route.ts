import { NextResponse } from 'next/server';

const CBR_RATES_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';
const MOSCOW_WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=55.7558&longitude=37.6176&current=temperature_2m,apparent_temperature,weather_code&timezone=Europe%2FMoscow';

type CurrencyCode = 'CNY' | 'USD' | 'EUR';

function parseNumber(value: string) {
  return Number(value.replace(',', '.'));
}

function extractRate(xml: string, code: CurrencyCode) {
  const currencyBlock = xml
    .match(/<Valute\b[\s\S]*?<\/Valute>/g)
    ?.find((block) => block.includes(`<CharCode>${code}</CharCode>`));

  if (!currencyBlock) {
    throw new Error(`Currency ${code} is missing from the CBR response`);
  }

  const nominal = currencyBlock.match(/<Nominal>([^<]+)<\/Nominal>/)?.[1];
  const value = currencyBlock.match(/<Value>([^<]+)<\/Value>/)?.[1];

  if (!nominal || !value) {
    throw new Error(`Currency ${code} has an invalid CBR response`);
  }

  return parseNumber(value) / parseNumber(nominal);
}

async function getRates() {
  const response = await fetch(CBR_RATES_URL, {
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`CBR request failed with status ${response.status}`);
  }

  const xml = await response.text();
  const effectiveDate = xml.match(/<ValCurs\b[^>]*Date="([^"]+)"/)?.[1] ?? null;

  return {
    CNY: extractRate(xml, 'CNY'),
    USD: extractRate(xml, 'USD'),
    EUR: extractRate(xml, 'EUR'),
    effectiveDate,
  };
}

async function getWeather() {
  const response = await fetch(MOSCOW_WEATHER_URL, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`Weather request failed with status ${response.status}`);
  }

  const data = await response.json();
  const current = data.current;

  if (
    typeof current?.temperature_2m !== 'number' ||
    typeof current?.apparent_temperature !== 'number' ||
    typeof current?.weather_code !== 'number'
  ) {
    throw new Error('Weather response has an unexpected format');
  }

  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    weatherCode: current.weather_code,
  };
}

export async function GET() {
  const [ratesResult, weatherResult] = await Promise.allSettled([
    getRates(),
    getWeather(),
  ]);

  const rates = ratesResult.status === 'fulfilled' ? ratesResult.value : null;
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;

  return NextResponse.json(
    {
      rates,
      weather,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    },
  );
}
