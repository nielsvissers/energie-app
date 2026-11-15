'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getHomeAssistantSensoren,
  getMetingTypesMetSensoren,
  koppelHaEntityId,
  HASensor,
  setDailyReset,
  setSingleSourceOffPeak,
  setSingleSourcePeak,
} from '@/actions/instellingenActions';

export default function InstellingenPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [haSensoren, setHaSensoren] = useState<HASensor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [zoekTerm, setZoekTerm] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setFoutmelding(null);

    const [typesRes, haRes] = await Promise.all([
      getMetingTypesMetSensoren(),
      getHomeAssistantSensoren(),
    ]);

    setTypes(typesRes);

    if (haRes.success) {
      setHaSensoren(haRes.sensoren);
    } else {
      setFoutmelding(haRes.error || 'Kan sensoren niet ophalen uit Home Assistant.');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleKoppelingChange = async (metingTypeId: number, newEntityId: string) => {
    setSavingId(metingTypeId);
    const val = newEntityId === '' ? null : newEntityId;

    const res = await koppelHaEntityId(metingTypeId, val);
    if (res.success) {
      setTypes((prev) =>
        prev.map((t) => (t.id === metingTypeId ? { ...t, haEntityId: val } : t))
      );
    } else {
      alert(`Fout bij opslaan: ${res.error}`);
    }
    setSavingId(null);
  };
  const handleDailyResetChange = async (metingTypeId: number, dailyReset: boolean) => {
    setSavingId(metingTypeId);
    const res = await setDailyReset(metingTypeId, dailyReset);
    if (res.success) {
      setTypes((prev) =>
        prev.map((t) => (t.id === metingTypeId ? { ...t, haDailyReset: dailyReset } : t))
      );
    } else {
      alert(`Fout bij opslaan: ${res.error}`);
    }
    setSavingId(null);
  };
  const handleSingleSourceOffPeakChange = async (metingTypeId: number, singleSourceOffPeak: boolean) => {
    setSavingId(metingTypeId);
    const res = await setSingleSourceOffPeak(metingTypeId, singleSourceOffPeak);
    if (res.success) {
      setTypes((prev) =>
        prev.map((t) => (t.id === metingTypeId ? { ...t, haSingleSourceOffPeak: singleSourceOffPeak } : t))
      );
    } else {
      alert(`Fout bij opslaan: ${res.error}`);
    }
    setSavingId(null);
  };
  const handleSingleSourcePeakChange = async (metingTypeId: number, singleSourcePeak: boolean) => {
    setSavingId(metingTypeId);
    const res = await setSingleSourcePeak(metingTypeId, singleSourcePeak);
    if (res.success) {
      setTypes((prev) =>
        prev.map((t) => (t.id === metingTypeId ? { ...t, haSingleSourcePeak: singleSourcePeak } : t))
      );
    } else {
      alert(`Fout bij opslaan: ${res.error}`);
    }
    setSavingId(null);
  };

  // Filter de opties in het dropdownmenu op zoekterm indien gewenst
  const gefilterdeSensoren = haSensoren.filter(
    (s) =>
      s.friendly_name.toLowerCase().includes(zoekTerm.toLowerCase()) ||
      s.entity_id.toLowerCase().includes(zoekTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 text-slate-100 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-emerald-400">⚙️ Home Assistant Koppelingen</h1>
          <p className="text-xs text-slate-400">Koppel je Home Assistant sensoren aan de Prisma metingtypes</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-2"
        >
          🔄 {loading ? 'Ophalen...' : 'Sensoren Herladen'}
        </button>
      </div>

      <Link
        href="/instellingen/daluren"
        className="block bg-slate-900 border border-slate-800 p-4 rounded-lg hover:border-emerald-500/60 transition"
      >
        <div className="text-sm font-semibold text-slate-200">Daluren instellen</div>
        <div className="mt-1 text-xs text-slate-400">Configureer de daluren en weekendregeling voor Home Assistant-metingen.</div>
      </Link>

      <Link
        href="/instellingen/statistics-sync"
        className="block bg-slate-900 border border-slate-800 p-4 rounded-lg hover:border-emerald-500/60 transition"
      >
        <div className="text-sm font-semibold text-slate-200">Statistics-sync uitvoeren</div>
        <div className="mt-1 text-xs text-slate-400">Start een historische, incrementele of dagelijkse Home Assistant-sync.</div>
      </Link>

      {foutmelding && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-300 text-xs p-4 rounded-xl">
          ⚠️ {foutmelding}
        </div>
      )}

      {/* Zoekbalk voor snelle navigatie door sensoren */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Filter sensorenlijst ({haSensoren.length} gevonden in HA)
        </label>
        <input
          type="text"
          placeholder="Zoek op naam (bijv. 'Grid', 'Zonne', 'kWh')..."
          value={zoekTerm}
          onChange={(e) => setZoekTerm(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-emerald-500"
        />
      </div>

      {/* Koppelingen Tabel / Lijst */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Home Assistant entiteiten laden...</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {types.map((type) => (
              <div key={type.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition">
                <div className="sm:w-1/3">
                  <div className="text-sm font-bold text-slate-200">{type.naam}</div>
                  <div className="text-[11px] font-mono text-emerald-400/80">{type.code} ({type.eenheid})</div>
                </div>

                <div className="sm:w-2/3">
                  <div>
                    <select
                      value={type.haEntityId || ''}
                      disabled={savingId === type.id}
                      onChange={(e) => handleKoppelingChange(type.id, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-emerald-500 transition disabled:opacity-50"
                    >
                      <option value="">-- Geen sensor gekoppeld --</option>
                      {gefilterdeSensoren.map((sensor) => (
                        <option key={sensor.entity_id} value={sensor.entity_id}>
                          {sensor.friendly_name} [{sensor.entity_id}] {sensor.unit_of_measurement ? `(${sensor.unit_of_measurement})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex shrink-0 items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={type.haDailyReset ?? false}
                        onChange={(e) => { handleDailyResetChange(type.id, e.target.checked); }}
                        className="accent-emerald-500"
                      />
                      Meting reset dagelijks (bijv. voor dagtotalen)
                    </label>
                  </div>
                  <div>
                    <label className="flex shrink-0 items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={type.haSingleSourcePeak ?? false}
                        onChange={(e) => { handleSingleSourcePeakChange(type.id, e.target.checked); }}
                        className="accent-emerald-500"
                      />
                      Piekwaarde komt van dezelfde bron (bijv. voor slimme meters)
                    </label>
                  </div>
                  <div>
                    <label className="flex shrink-0 items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={type.haSingleSourceOffPeak ?? false}
                        onChange={(e) => { handleSingleSourceOffPeakChange(type.id, e.target.checked); }}
                        className="accent-emerald-500"
                      />
                      Dalwaarde komt van dezelfde bron (bijv. voor slimme meters)
                    </label>
                  </div>
                  <div>
                    {savingId === type.id &&
                      <span className="text-xs text-emerald-400 font-mono animate-pulse">Opslaan...</span>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}