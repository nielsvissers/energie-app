'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Contract } from '@/types/Contract';
import { getContractenMetTarieven, opslaanContract } from '@/actions/contractenActions';
import TariefModal from '@/components/ContractTariefModal';



// --- HOOFDPAGINA ---
export default function NieuwContractPage() {
    const router = useRouter();
    const [contracten, setContracten] = useState<Contract[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [nieuwContract, setNieuwContract] = useState<Partial<Contract>>({
        id: 0,
        leverancier: '',
        contractNaam: '',
        type: 'VAST',
        startDatum: new Date(),
        eindDatum: new Date(),
        tarieven: [],
    });

    useEffect(() => {
        async function init() {
            const cons = await getContractenMetTarieven();
            setContracten(cons);
        }
        init();
    }, []);

    const handleTariefToevoegen = (nieuwTarief: any) => {
        setNieuwContract((prev) => ({
            ...prev,
            tarieven: [...(prev.tarieven ?? []), nieuwTarief],
        }));
    };

    const handleVerwijderTarief = (index: number) => {
        setNieuwContract((prev) => ({
            ...prev,
            tarieven: (prev.tarieven ?? []).filter((_, i) => i !== index),
        }));
    };

    const handleContractSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            leverancier: nieuwContract.leverancier,
            contractNaam: nieuwContract.contractNaam,
            startDatum: nieuwContract.startDatum?.toISOString().slice(0, 10),
            eindDatum: nieuwContract.eindDatum ? nieuwContract.eindDatum.toISOString().slice(0, 10) : undefined,
            tarieven: (nieuwContract.tarieven ?? []).map((t) => ({
                /*type: t.type,
                prijsPerEenheid: t.prijsPerEenheid,
                isVasteKostPerJaar: t.isVasteKostPerJaar ?? false,
                herrekenPerDag: t.herrekenPerDag ?? false,
                isCent: t.isCent ?? false,*/
            })),
        };

        const res = await opslaanContract(nieuwContract as Contract);

        if (res.success) {
            alert('Contract & tarieven succesvol opgeslagen!');
            router.push('/facturen');
        } else {
            alert(`Fout bij opslaan: ${res.error}`);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulier nieuw contract */}
            <form onSubmit={handleContractSubmit} className="lg:col-span-1 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
                <h2 className="text-lg font-bold text-emerald-400">Nieuw Contract Toevoegen</h2>

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Leverancier</label>
                    <input
                        type="text"
                        required
                        placeholder="bijv. Eneco, Engie, Bolt"
                        value={nieuwContract.leverancier}
                        onChange={(e) => setNieuwContract({ ...nieuwContract, leverancier: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Contractnaam</label>
                    <input
                        type="text"
                        required
                        placeholder="bijv. Go Flex Variabel"
                        value={nieuwContract.contractNaam}
                        onChange={(e) => setNieuwContract({ ...nieuwContract, contractNaam: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Type</label>
                    <select
                        value={nieuwContract.type}
                        onChange={(e) => setNieuwContract({ ...nieuwContract, type: e.target.value as Contract['type'] })}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                    >
                        <option value="VAST">Vast</option>
                        <option value="VARIABEL">Variabel</option>
                        <option value="DYNAMISCH">Dynamisch</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Startdatum</label>
                        <input
                            type="date"
                            required
                            value={nieuwContract.startDatum ? nieuwContract.startDatum.toISOString().slice(0, 10) : ''}
                            onChange={(e) => setNieuwContract({ ...nieuwContract, startDatum: e.target.value ? new Date(e.target.value) : undefined })}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Einddatum</label>
                        <input
                            type="date"
                            required
                            value={nieuwContract.eindDatum ? nieuwContract.eindDatum.toISOString().slice(0, 10) : ''}
                            onChange={(e) => setNieuwContract({ ...nieuwContract, eindDatum: e.target.value ? new Date(e.target.value) : undefined })}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                </div>

                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded text-sm transition mt-4">
                    Contract & Tarieven Opslaan
                </button>
            </form>

            {/* Overzicht Toegevoegde Tarieven */}
            <div className="lg:col-span-2">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h2 className="text-lg font-bold text-emerald-400">Gekoppelde Tarieven</h2>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition"
                        >
                            + Tarief toevoegen
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                        {nieuwContract && nieuwContract.tarieven &&
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                                    <tr>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Prijs per eenheid</th>
                                        <th className="p-3">Eigenschappen</th>
                                        <th className="p-3 text-center">Actie</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                                    {nieuwContract.tarieven.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                                                Nog geen tarieven toegevoegd. Klik op "+ Tarief toevoegen" om tarieven aan dit contract te koppelen.
                                            </td>
                                        </tr>
                                    ) : (
                                        nieuwContract.tarieven.map((t, idx) => (
                                            /*<tr key={idx} className="hover:bg-slate-800/30 transition">
                                              <td className="p-3 font-medium text-emerald-400">{t.type}</td>
                                              <td className="p-3 font-mono text-slate-200">
                                                {t.prijsPerEenheid} {t.isCent ? 'c€' : '€'}
                                              </td>
                                              <td className="p-3 text-slate-400 space-x-1">
                                                {t.isVasteKostPerJaar && <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Vast/Jaar</span>}
                                                {t.herrekenPerDag && <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Per Dag</span>}
                                              </td>
                                              <td className="p-3 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleVerwijderTarief(idx)}
                                                  className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1"
                                                >
                                                  ✕
                                                </button>
                                              </td>
                                            </tr>*/
                                            <pre>{JSON.stringify(t, null, 2)}</pre>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        }
                    </div>
                </div>
            </div>

            {/* Modal Dialog */}
            <TariefModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleTariefToevoegen}
            />
        </div>
    );
}