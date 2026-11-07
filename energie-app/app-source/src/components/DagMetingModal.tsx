'use client';

import React, { useState, useEffect } from 'react';
import {
    getMetingTypes,
    getMetingenVoorDatum,
    opslaanDagMetingen,
    getVolgendeStandaardDatum
} from '@/actions/dagMetingActions';

interface DagMetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void; // Optionele callback om bijv. gegevens op het scherm te verversen
}

export default function DagMetingModal({ isOpen, onClose, onSuccess }: DagMetingModalProps) {
    const [datum, setDatum] = useState<string>('');
    const [types, setTypes] = useState<any[]>([]);
    const [waarden, setWaarden] = useState<Record<number, number | string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    // 1. Haal de beschikbare types op wanneer de modal opent
    useEffect(() => {
        if (!isOpen) return;

        async function init() {
            setLoading(true);

            const [typesData, voorgesteldeDatum] = await Promise.all([
                getMetingTypes(),
                getVolgendeStandaardDatum()
            ]);

            setTypes(typesData);

            if (voorgesteldeDatum) {
                setDatum(voorgesteldeDatum);
            }

            setLoading(false);
        }
        init();
    }, [isOpen]);

    // 2. Haal bestaande data op zodra de datum verandert
    useEffect(() => {
        if (!isOpen || !datum) {
            setWaarden({});
            return;
        }

        async function loadDatumData() {
            setLoading(true);
            const bestaandeMetingen = await getMetingenVoorDatum(datum);
            setWaarden(bestaandeMetingen || {});
            setLoading(false);
        }
        loadDatumData();
    }, [datum, isOpen]);

    const handleWaardeChange = (typeId: number, val: string) => {
        setWaarden((prev) => ({
            ...prev,
            [typeId]: val === '' ? '' : parseFloat(val),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const opTeSlaanWaarden: Record<number, number> = {};
        Object.entries(waarden).forEach(([key, val]) => {
            if (val !== '' && !isNaN(Number(val))) {
                opTeSlaanWaarden[Number(key)] = Number(val);
            }
        });

        const res = await opslaanDagMetingen(datum, opTeSlaanWaarden);
        setSaving(false);

        if (res.success) {
            if (onSuccess) {
                onSuccess();
            }
            onClose(); // Sluit de modal na succesvol opslaan
        } else {
            alert(`Fout bij opslaan: ${res.error}`);
        }
    };

    // Als de modal niet open is, niks renderen
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-emerald-400">⚡ Dagelijks Verbruik Ingeven</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 text-lg font-bold"
                        aria-label="Sluiten"
                    >
                        ✕
                    </button>
                </div>

                {/* Form Body (met scrollbar voor kleinere schermen) */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                    {/* Datum Selectie */}
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Datum van meting
                        </label>
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

                    {/* Footer Acties */}
                    <div className="pt-4 border-t border-slate-800 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-lg transition text-sm"
                        >
                            Annuleren
                        </button>
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold py-3 rounded-lg transition shadow-lg text-sm"
                        >
                            {saving ? 'Bezig met opslaan...' : 'Metingen Opslaan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}