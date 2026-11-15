'use server';

import {
  syncHistoricalStatistics,
  syncIncrementalStatistics,
  syncStatisticsForDay,
  type StatisticsSyncOptions,
  type StatisticsSyncSummary,
} from '@/lib/homeassistant/statistics-sync';

type SyncMode = 'historical' | 'incremental' | 'day';

type ParsedSyncRequest =
  | { mode: 'historical' | 'incremental'; options: StatisticsSyncOptions }
  | { mode: 'day'; date: string; options: StatisticsSyncOptions };

type ParseResult = { request: ParsedSyncRequest } | { error: string };

export async function runStatisticsSync(input: unknown) {
  const parsed = parseSyncRequest(input);
  if ('error' in parsed) return { success: false, error: parsed.error };

  try {
    const { request } = parsed;
    const summary: StatisticsSyncSummary = request.mode === 'historical'
      ? await syncHistoricalStatistics(request.options)
      : request.mode === 'day'
        ? await syncStatisticsForDay(request.date, request.options)
        : await syncIncrementalStatistics(request.options);

    return {
      success: summary.failedStatistics === 0,
      ...(request.mode === 'day' ? { date: request.date } : {}),
      ...summary,
    };
  } catch (error) {
    console.error('[HA statistics] Manual sync action failed.', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Statistics sync failed.',
    };
  }
}

function parseSyncRequest(input: unknown): ParseResult {
  if (!isRecord(input)) {
    return { error: 'Request body must be a JSON object.' };
  }

  const body = input;
  const mode = body.mode ?? 'incremental';
  if (mode !== 'historical' && mode !== 'incremental' && mode !== 'day') {
    return { error: 'mode must be historical, incremental, or day.' };
  }
  if (mode === 'day' && (typeof body.date !== 'string' || !isLocalDate(body.date))) {
    return { error: 'date is required and must be a valid YYYY-MM-DD calendar date for mode day.' };
  }
  if (mode === 'day' && (body.startTime !== undefined || body.endTime !== undefined)) {
    return { error: 'Use date instead of startTime/endTime for mode day.' };
  }
  if (
    (body.chunkDays !== undefined && typeof body.chunkDays !== 'number') ||
    (body.statisticBatchSize !== undefined && typeof body.statisticBatchSize !== 'number') ||
    (body.chunkDays !== undefined && (!Number.isInteger(body.chunkDays) || body.chunkDays < 1 || body.chunkDays > 30)) ||
    (body.statisticBatchSize !== undefined && (!Number.isInteger(body.statisticBatchSize) || body.statisticBatchSize < 1))
  ) {
    return { error: 'chunkDays must be 1-30 and statisticBatchSize must be a positive integer.' };
  }

  const options: StatisticsSyncOptions = {};
  for (const [field, option] of [
    ['startTime', 'startTime'],
    ['endTime', 'endTime'],
    ['minimumSearchDate', 'minimumSearchDate'],
  ] as const) {
    const value = body[field];
    if (value === undefined) continue;
    if (typeof value !== 'string') return { error: `${field} must be a valid ISO date.` };
    const parsedDate = new Date(value);
    if (!Number.isFinite(parsedDate.getTime())) return { error: `${field} must be a valid ISO date.` };
    options[option] = parsedDate;
  }

  if (body.chunkDays !== undefined) options.chunkDays = body.chunkDays;
  if (body.statisticBatchSize !== undefined) options.statisticBatchSize = body.statisticBatchSize;

  if (mode === 'day') {
    if (typeof body.date !== 'string') return { error: 'date is required for mode day.' };
    return { request: { mode, date: body.date, options } };
  }
  return { request: { mode, options } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
