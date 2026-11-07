'use client';

import { AddTariefType, GetTariefTypes } from '@/actions/tariefTypesActions';
import { ContractTarief, Prisma, TariefType } from '@prisma/client';
import React, { useEffect, useState } from 'react';
import { DecimalInput } from './inputs/DecimalInput';
import { RoundTo } from '@/lib/round';
import { DateInput } from './inputs/DateInput';

interface TariefModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tariefData: any) => void;
}

export default function TariefModal({ isOpen, onClose, onConfirm }: TariefModalProps) {
    const [tariefTypes, setTariefTypes] = useState<TariefType[]>([]);
    const [nieuwTariefType, setNieuwTariefType] = useState<Partial<TariefType>>({});
    const [tarief, setTarief] = useState<Partial<Prisma.ContractTariefGetPayload<{ include: { type: true } }>>>({})
    const [btwPercent, setBtwPercent] = useState<number>();
    // Sluit de modal wanneer de 'Escape' toets wordt ingedrukt
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            const fetchTariefTypes = async () => {
                const types = await GetTariefTypes();
                if (types) {
                    setTariefTypes(types);
                }
            };

            fetchTariefTypes();
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Als de modal niet open is, render niets
    if (!isOpen) return null;


    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const nieuwTarief = tarief;
        if (tarief.tariefTypeId === 0) {
            if (!nieuwTariefType.beschrijving || !nieuwTariefType.sleutel || !nieuwTariefType.waarde) {
                alert("Vul a.u.b. alle verplichte velden in!");
                return;
            }
            let newTariefType = await AddTariefType({ beschrijving: nieuwTariefType.beschrijving, sleutel: nieuwTariefType.sleutel, waarde: nieuwTariefType.waarde, id: 0 });
            nieuwTarief.tariefTypeId = newTariefType.id;
            nieuwTarief.type = newTariefType;
        }


        onConfirm(nieuwTarief);
        onClose();
    };

    return (
        /* Backdrop Overlay */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity animate-fade-in"
            onClick={onClose}
        >
            {/* Modal Container (stopPropagation voorkomt sluiten bij klik binnenin) */}
            <div
                className="w-full max-w-lg bg-slate-900 border border-slate-800 text-slate-100 rounded-xl shadow-2xl overflow-hidden transform transition-all animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-emerald-400">⚡ Tarief Toevoegen</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition p-1 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Tarief Type
                            </label>
                            <select
                                value={tarief.tariefTypeId !== undefined ? tarief.tariefTypeId.toString() : '-1'}
                                onChange={(e) => setTarief({ ...tarief, tariefTypeId: Number(e.target.value) })}
                                name="type"
                                required
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            >
                                <option disabled value='-1' defaultValue='-1' key='-1'>Kies Tarieftype</option>
                                <option value="0" key="0">Nieuw</option>
                                {
                                    tariefTypes.map((type) => {
                                        return (<option value={type.id} key={type.id}>{type.beschrijving}</option>)
                                    })
                                }
                            </select>
                        </div>
                        {tarief !== undefined && tarief.tariefTypeId !== undefined && tarief.tariefTypeId === 0 &&
                            <div className='lg:col-span-1 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4'>
                                <h2 className="text-md font-semibold text-emerald-400">Nieuw Tarieftype</h2>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Tarieftype sleutel
                                    </label>
                                    <input
                                        value={nieuwTariefType.sleutel === null ? '' : nieuwTariefType.sleutel}
                                        onChange={(e) => setNieuwTariefType({ ...nieuwTariefType, sleutel: e.target.value })}
                                        type='text'
                                        name="nieuwTariefType_sleutel"
                                        placeholder="sleutel"
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Tarieftype beschrijving
                                    </label>
                                    <input
                                        value={nieuwTariefType.beschrijving === null ? '' : nieuwTariefType.beschrijving}
                                        onChange={(e) => setNieuwTariefType({ ...nieuwTariefType, beschrijving: e.target.value })}
                                        type='text'
                                        name="nieuwTariefType_beschrijving"
                                        placeholder="beschrijving"
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Tarieftype waarde
                                    </label>
                                    <input
                                        value={nieuwTariefType.waarde === null ? '' : nieuwTariefType.waarde}
                                        onChange={(e) => setNieuwTariefType({ ...nieuwTariefType, waarde: e.target.value })}
                                        type='text'
                                        name="nieuwTariefType_waarde"
                                        placeholder="waarde"
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                        }
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Eenheid</label>
                            <select
                                value={tarief.eenheid}
                                onChange={(e) => setTarief({ ...tarief, eenheid: e.target.value as any })}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            >
                                <option value="KWH">per kWh</option>
                                <option value="KW_JAAR">per kW/jaar (Capaciteit)</option>
                                <option value="VAST_JAAR">Vast per Jaar</option>
                                <option value="MAAND">Vast per Maand</option>
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="VAST_BEDRAG">Vast Bedrag (€)</option>
                                <option value="KVA_JAAR">€/kVA/jaar</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                BTW-percentage
                            </label>
                            <input
                                type="number"
                                name="btwPercentage"
                                value={tarief.btwPercentage}
                                onChange={(e) => setTarief({ ...tarief, btwPercentage: parseFloat(e.target.value) })}
                                step="1"
                                placeholder="6"
                                required
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <DecimalInput label='Prijs per eenheid Excl BTW'
                            onChange={(value) => {
                                setTarief({ ...tarief, prijsPerEenheidExclBtw: value });
                            }}
                            onBlur={(value) => {
                                const calculatedInclBtw =value * (1 + (tarief.btwPercentage ?? 0) / 100);
                                if (tarief.btwPercentage !== undefined && tarief.btwPercentage > 0 && tarief.prijsPerEenheidInclBtw !== calculatedInclBtw) {
                                    setTarief({ ...tarief, prijsPerEenheidInclBtw: calculatedInclBtw });
                                }
                            }}
                            value={parseFloat(tarief.prijsPerEenheidExclBtw?.toString() || '0')}
                        />
                        <DecimalInput label='Prijs per eenheid Incl BTW'
                            onChange={(value) => {
                                setTarief({ ...tarief, prijsPerEenheidInclBtw: value });
                            }}
                            onBlur={(value) => {
                                const calculatedExclBtw = value / (1 + (tarief.btwPercentage ?? 0) / 100);
                                if (tarief.btwPercentage !== undefined && tarief.btwPercentage > 0 && tarief.prijsPerEenheidExclBtw !== calculatedExclBtw) {
                                    setTarief({ ...tarief, prijsPerEenheidExclBtw: calculatedExclBtw });
                                }
                            }}
                            value={parseFloat(tarief.prijsPerEenheidInclBtw?.toString() || '0')}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <DateInput label="Geldig van"
                                value={tarief.geldigVan}
                                onChange={(date) => setTarief({ ...tarief, geldigVan: date ?? undefined })} />
                            <DateInput label="Geldig tot"
                                value={tarief.geldigTot}
                                onChange={(date) => setTarief({ ...tarief, geldigTot: date ?? undefined })} />
                        </div>

                        {/* Vinkjes voor opties */}
                        <div className="space-y-2 pt-2 border-t border-slate-800/60">
                            <label className="flex items-center space-x-3 text-xs text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="herrekenPerDag"
                                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500/20"
                                    checked={tarief.herrekenPerDag}
                                    onChange={(date) => setTarief({ ...tarief, herrekenPerDag: date.target.checked ?? undefined })}
                                />
                                <span>Herrekenen per dag (365d)</span>
                            </label>
                        </div>
                    </div>

                    {/* Footer met Actie-knoppen */}
                    <div className="flex justify-end gap-3 px-6 py-4 bg-slate-950 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
                        >
                            Annuleren
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-md"
                        >
                            Toevoegen aan lijst
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}