'use client';

import Link from 'next/link';
import { useState } from 'react';
import { runStatisticsSync } from '@/actions/statisticsSyncActions';

type SyncMode = 'historical' | 'incremental' | 'day';

const inputClassName =
  'block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500';

function dateAtUtcStart(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function dateAtUtcEnd(date: string): string {
  return `${date}T23:59:59.999Z`;
}

export default function StatisticsSyncInstellingenPagina() {
  const [mode, setMode] = useState<SyncMode>('incremental');
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minimumSearchDate, setMinimumSearchDate] = useState('');
  const [chunkDays, setChunkDays] = useState('');
  const [statisticBatchSize, setStatisticBatchSize] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const submitSync = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setResult(null);

    const body: Record<string, string | number> = { mode };
    if (mode === 'day') {
      body.date = date;
    } else {
      if (startDate) body.startTime = dateAtUtcStart(startDate);
      if (endDate) body.endTime = dateAtUtcEnd(endDate);
      if (minimumSearchDate) {
        body.minimumSearchDate = dateAtUtcStart(minimumSearchDate);
      }
    }
    if (chunkDays) body.chunkDays = Number(chunkDays);
    if (statisticBatchSize) body.statisticBatchSize = Number(statisticBatchSize);

    try {
      const responseBody = await runStatisticsSync(body);
      setResult(JSON.stringify(responseBody, null, 2) ?? '{}');
      if ('error' in responseBody && typeof responseBody.error === 'string') {
        setMessage(responseBody.error);
      } else if (responseBody.success === false) {
        setMessage('Sync afgerond, maar een of meer statistieken zijn mislukt.');
      } else {
        setMessage('Sync afgerond.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sync mislukt door een onbekende fout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 text-slate-100 md:p-6">
      <header>
        <Link href="/instellingen" className="text-xs text-emerald-400 hover:text-emerald-300">
          Instellingen
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">Home Assistant statistics-sync</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start een historische, incrementele of dagelijkse synchronisatie.
        </p>
      </header>

      <form onSubmit={submitSync} className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Synchronisatiemodus</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as SyncMode)}
            className={inputClassName}
          >
            <option value="incremental">Incrementeel</option>
            <option value="historical">Historisch</option>
            <option value="day">Eén dag opnieuw ophalen</option>
          </select>
        </label>

        {mode === 'day' ? (
          <label className="block space-y-2 text-sm text-slate-300">
            <span>Dag</span>
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClassName}
            />
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span>
                {mode === 'historical' ? 'Historische startdatum' : 'Startdatum voor nieuwe statistieken'} (optioneel)
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClassName}
              />
              {mode === 'incremental' && (
                <span className="block text-xs text-slate-500">
                  Alleen gebruikt als de incrementele sync een historische import voor nieuwe statistieken start.
                </span>
              )}
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Einddatum (optioneel)</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputClassName}
              />
            </label>
            {!startDate && (
              <label className="space-y-2 text-sm text-slate-300">
                <span>
                  {mode === 'historical' ? 'Zoek oudste data vanaf' : 'Zoek nieuwe historische data vanaf'} (optioneel)
                </span>
                <input
                  type="date"
                  value={minimumSearchDate}
                  onChange={(event) => setMinimumSearchDate(event.target.value)}
                  className={inputClassName}
                />
                <span className="block text-xs text-slate-500">
                  Alleen gebruikt als geen startdatum is ingevuld en er een historische import nodig is.
                </span>
              </label>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Chunkgrootte in dagen (1–30, optioneel)</span>
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={chunkDays}
              onChange={(event) => setChunkDays(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span>Aantal statistieken per batch (positief, optioneel)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={statisticBatchSize}
              onChange={(event) => setStatisticBatchSize(event.target.value)}
              className={inputClassName}
            />
          </label>
        </div>

        <p className="text-xs text-slate-500">
          Lege opties gebruiken de serverstandaard. Een ingevulde einddatum is inclusief de volledige dag.
        </p>

        <p className="rounded-lg border border-amber-900/80 bg-amber-950/40 p-3 text-xs text-amber-200">
          Handmatig synchroniseren is beschikbaar voor iedereen die deze app kan bereiken. Gebruik deze pagina alleen op een vertrouwd netwerk.
        </p>

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Synchroniseren...' : 'Synchronisatie starten'}
        </button>
      </form>

      {message && (
        <p role="status" className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
          {message}
        </p>
      )}
      {result && (
        <section aria-label="Syncresultaat" className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-200">Resultaat</h2>
          <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
            {result}
          </pre>
        </section>
      )}
    </main>
  );
}
