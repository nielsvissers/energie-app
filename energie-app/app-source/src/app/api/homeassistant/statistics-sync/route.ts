import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  syncHistoricalStatistics,
  syncIncrementalStatistics,
  syncStatisticsForDay,
  type StatisticsSyncOptions,
} from '@/lib/homeassistant/statistics-sync';

export const runtime = 'nodejs';

interface SyncRequestBody {
  mode?: 'historical' | 'incremental' | 'day';
  date?: string;
  startTime?: string;
  endTime?: string;
  chunkDays?: number;
  statisticBatchSize?: number;
}

/** Runs a protected historical, incremental, or single-day statistics sync. */
export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization') ?? '';
  const suppliedSecret = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!safeCompare(suppliedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  let body: SyncRequestBody;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }
    body = parsed as SyncRequestBody;
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const mode = body.mode ?? 'incremental';
  if (mode !== 'historical' && mode !== 'incremental' && mode !== 'day') {
    return NextResponse.json({ error: 'mode must be historical, incremental, or day.' }, { status: 400 });
  }
  if (mode === 'day' && (typeof body.date !== 'string' || !isLocalDate(body.date))) {
    return NextResponse.json({ error: 'date is required and must be a valid YYYY-MM-DD calendar date for mode day.' }, { status: 400 });
  }
  if (mode === 'day' && (body.startTime !== undefined || body.endTime !== undefined)) {
    return NextResponse.json({ error: 'Use date instead of startTime/endTime for mode day.' }, { status: 400 });
  }
  if (
    (body.chunkDays !== undefined && typeof body.chunkDays !== 'number') ||
    (body.statisticBatchSize !== undefined && typeof body.statisticBatchSize !== 'number') ||
    (body.chunkDays !== undefined && (!Number.isInteger(body.chunkDays) || body.chunkDays < 1 || body.chunkDays > 30)) ||
    (body.statisticBatchSize !== undefined && (!Number.isInteger(body.statisticBatchSize) || body.statisticBatchSize < 1))
  ) {
    return NextResponse.json({ error: 'chunkDays must be 1-30 and statisticBatchSize must be a positive integer.' }, { status: 400 });
  }

  const options: StatisticsSyncOptions = {};
  if (body.startTime !== undefined) {
    if (typeof body.startTime !== 'string') {
      return NextResponse.json({ error: 'startTime must be a valid ISO date.' }, { status: 400 });
    }
    const startTime = parseDate(body.startTime);
    if (!startTime) return NextResponse.json({ error: 'startTime must be a valid ISO date.' }, { status: 400 });
    options.startTime = startTime;
  }
  if (body.endTime !== undefined) {
    if (typeof body.endTime !== 'string') {
      return NextResponse.json({ error: 'endTime must be a valid ISO date.' }, { status: 400 });
    }
    const endTime = parseDate(body.endTime);
    if (!endTime) return NextResponse.json({ error: 'endTime must be a valid ISO date.' }, { status: 400 });
    options.endTime = endTime;
  }
  if (body.chunkDays !== undefined) options.chunkDays = body.chunkDays;
  if (body.statisticBatchSize !== undefined) options.statisticBatchSize = body.statisticBatchSize;

  try {
    const summary = mode === 'historical'
      ? await syncHistoricalStatistics(options)
      : mode === 'day'
        ? await syncStatisticsForDay(body.date!, options)
        : await syncIncrementalStatistics(options);
    return NextResponse.json({ success: summary.failedStatistics === 0, date: mode === 'day' ? body.date : undefined, ...summary });
  } catch (error) {
    console.error('[HA statistics] Sync route failed.', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Statistics sync failed.' },
      { status: 500 }
    );
  }
}

function safeCompare(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}