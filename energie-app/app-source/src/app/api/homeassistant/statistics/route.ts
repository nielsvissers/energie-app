import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getHomeAssistantStatisticsForDay } from '@/lib/homeassistant/statistics-sync';

export const runtime = 'nodejs';

/** Returns raw long-term statistics for one Belgian calendar day without saving them. */
export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization') ?? '';
  const suppliedSecret = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!safeCompare(suppliedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const statisticId = url.searchParams.get('statisticId') ?? undefined;
  if (!date || !isLocalDate(date)) {
    return NextResponse.json({ error: 'date is required as a valid YYYY-MM-DD date.' }, { status: 400 });
  }

  try {
    const result = await getHomeAssistantStatisticsForDay(date, statisticId);
    return NextResponse.json({ success: result.errors.length === 0, ...result });
  } catch (error) {
    console.error('[HA statistics] Daily diagnostics request failed.', { date, statisticId, error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to retrieve Home Assistant statistics.' },
      { status: 500 }
    );
  }
}

function safeCompare(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}