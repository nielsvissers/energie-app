'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDalurenInstellingen, setDalurenInstellingen } from '@/actions/instellingenActions';
import { DalurenInstellingen } from '@/lib/daluren';

export default function DalurenInstellingenPagina() {
  const [instellingen, setInstellingen] = useState<DalurenInstellingen>({
    start: '22:00',
    einde: '06:00',
    weekends: true,
  });
  const [laden, setLaden] = useState(true);
  const [opslaan, setOpslaan] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    getDalurenInstellingen()
      .then(setInstellingen)
      .catch(() => setMelding('Daluren konden niet worden opgehaald.'))
      .finally(() => setLaden(false));
  }, []);

  const bewaarInstellingen = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOpslaan(true);
    setMelding(null);
    const resultaat = await setDalurenInstellingen(instellingen);
    setMelding(resultaat.success ? 'Daluren opgeslagen.' : resultaat.error ?? 'Opslaan is mislukt.');
    setOpslaan(false);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 text-slate-100 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/instellingen" className="text-xs text-emerald-400 hover:text-emerald-300">
            Instellingen
          </Link>
          <h1 className="mt-2 text-xl font-bold text-white">Daluren</h1>
        </div>
      </div>

      <form onSubmit={bewaarInstellingen} className="space-y-5 border-y border-slate-800 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Daluren vanaf</span>
            <input
              type="time"
              required
              value={instellingen.start}
              onChange={(event) => setInstellingen({ ...instellingen, start: event.target.value })}
              className="block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span>Daluren tot</span>
            <input
              type="time"
              required
              value={instellingen.einde}
              onChange={(event) => setInstellingen({ ...instellingen, einde: event.target.value })}
              className="block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={instellingen.weekends}
            onChange={(event) => setInstellingen({ ...instellingen, weekends: event.target.checked })}
            className="accent-emerald-500"
          />
          Weekend volledig als daluren tellen
        </label>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={laden || opslaan || instellingen.start === instellingen.einde}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {opslaan ? 'Opslaan...' : 'Opslaan'}
          </button>
          {melding && <p role="status" className="text-sm text-slate-300">{melding}</p>}
        </div>
      </form>
    </main>
  );
}