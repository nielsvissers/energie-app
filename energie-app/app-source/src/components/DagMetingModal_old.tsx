'use client';

import React, { useState, useEffect } from 'react'; import {
    getMetingTypes,
    getMetingenVoorDatum,
    opslaanDagMetingen,
    getVolgendeStandaardDatum
} from '@/actions/dagMetingActions';

interface MetingType {
    id: number;
    code: string;
    naam: string;
    eenheid: string;
}

export default function DagMetingInvoerenPage() {
    const [datum, setDatum] = useState<string>('');
    const [types, setTypes] = useState<any[]>([]);
    const [waarden, setWaarden] = useState<Record<number, number | string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    // 1. Haal de beschikbare types op
    useEffect(() => {
        async function init() {
            setLoading(true);

            const [typesData, voorgesteldeDatum] = await Promise.all([
                getMetingTypes(),
                getVolgendeStandaardDatum()
            ]);

            setTypes(typesData);

            // Als er een datum is gevonden (laatste datum + 1), stel deze in
            if (voorgesteldeDatum) {
                setDatum(voorgesteldeDatum);
            }

            setLoading(false);
        }
        init();
    }, []);

    // 2. Haal bestaande data op zodra de datum verandert
    useEffect(() => {
        async function loadDatumData() {
            if (!datum) {
                setWaarden({});
                return;
            }
            setLoading(true);
            const bestaandeMetingen = await getMetingenVoorDatum(datum);
            setWaarden(bestaandeMetingen);
            setLoading(false);
        }
        loadDatumData();
    }, [datum]);

    const handleWaardeChange = (typeId: number, val: string) => {
        setWaarden((prev) => ({
            ...prev,
            [typeId]: val === '' ? '' : parseFloat(val),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Filter lege velden eruit
        const opTeSlaanWaarden: Record<number, number> = {};
        Object.entries(waarden).forEach(([key, val]) => {
            if (val !== '' && !isNaN(Number(val))) {
                opTeSlaanWaarden[Number(key)] = Number(val);
            }
        });

        const res = await opslaanDagMetingen(datum, opTeSlaanWaarden);
        setSaving(false);

        if (res.success) {
            alert('Dagmetingen succesvol opgeslagen!');
        } else {
            alert(`Fout bij opslaan: ${res.error}`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl text-slate-100">
            <h1 className="text-xl font-bold text-emerald-400 mb-6">⚡ Dagelijks Verbruik Ingeven</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datum Selectie */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Datum van meting</label>
                    <input
                        type="date"
                        required
                        value={datum}
                        onChange={(e) => setDatum(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                </div>

                {/* Dynamische Invoervelden */}
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Metingen laden...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {types.map((t) => (
                            <div key={t.id} className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    {t.naam} <span className="text-slate-500">({t.eenheid})</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.001"
                                        placeholder="0.000"
                                        value={waarden[t.id] ?? ''}
                                        onChange={(e) => handleWaardeChange(t.id, e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white font-mono focus:border-emerald-500 outline-none pr-12"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 pointer-events-none">
                                        {t.eenheid}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving || loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold py-3 rounded-lg transition shadow-lg text-sm"
                >
                    {saving ? 'Bezig met opslaan...' : 'Metingen Opslaan'}
                </button>
            </form>
        </div>
    );
}