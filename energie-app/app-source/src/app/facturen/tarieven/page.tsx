// src/app/facturen/tarieven/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getKostencategorieen, voegKostencategorieToe } from '@/actions/categorieenActions';
import { getContractenMetTarieven, opslaanContract } from '@/actions/contractenActions';
import { ContractTarief } from '@prisma/client';
import { Contract } from '@/types/Contract';

export default function TarievenBeheerPage() {
    const [categorieen, setCategorieen] = useState<any[]>([]);
    const [contracten, setContracten] = useState<Contract[]>([]);
    const [actieveTab, setActieveTab] = useState<'contracten' | 'categorieen'>('contracten');

    // Formulier Contract
    const [leverancier, setLeverancier] = useState('');
    const [contractNaam, setContractNaam] = useState('');
    const [contractType, setContractType] = useState<'VAST' | 'VARIABEL' | 'DYNAMISCH'>('VAST');
    const [startDatum, setStartDatum] = useState('');
    const [eindDatum, setEindDatum] = useState('');

    // Gesplitste Tarieven state
    const [tarieven, setTarieven] = useState<ContractTarief[]>([]);

    // Formulier Kostencategorie
    const [catNaam, setCatNaam] = useState('');
    const [catType, setCatType] = useState<'NETTARIEF' | 'HEFFING' | 'ENERGIE' | 'BTW' | 'KORTING' | 'DIVERS'>('NETTARIEF');
    const [catEenheid, setCatEenheid] = useState<'KWH' | 'KW_JAAR' | 'VAST_JAAR' | 'MAAND' | 'PERCENTAGE' | 'VAST_BEDRAG'>('KWH');
    const [catHerrekenPerDag, setCatHerrekenPerDag] = useState(false);

    const laadData = async () => {
        const cats = await getKostencategorieen();
        const cons = await getContractenMetTarieven();
        setCategorieen(cats || []);
        setContracten(cons || []);
    };

    useEffect(() => {
        laadData();
    }, []);

    const handleContractSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Enkel ingevulde tarieven opslaan
       /* const gefilterdeTarieven = tarieven
            .filter(t => t.prijsPerEenheidInclBtw?.gt(0) ?? false)
            .map(t => ({
                type: t.type,
                prijsPerEenheid: Number(t.prijsPerEenheid) || 0,
                isVasteKostPerJaar: t.isVasteKostPerJaar ?? false, // Standaard false als niet ingevuld
                herrekenPerDag: t.herrekenPerDag ?? false,         // Standaard false als niet ingevuld
                isCent: t.isCent ?? false,                         // Standaard false als niet ingevuld
            }));*/

        /*const res = await opslaanContract({
            leverancier,
            contractNaam,
            type: contractType,
            startDatum,
            eindDatum: eindDatum || undefined
        });*/

        /*if (res.success) {
            alert("Energiecontract met tarieven succesvol opgeslagen!");
            setLeverancier('');
            setContractNaam('');
            setStartDatum('');
            setEindDatum('');
            setTarieven(tarieven.map(t => ({ ...t, prijsPerEenheid: 0, prijsPerEenheidstr: '' })));
            laadData();
        } else {
            alert(`Fout: ${res.error}`);
        }*/
    };

    const handleCategorieSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await voegKostencategorieToe({
            naam: catNaam,
            type: catType,
            eenheid: catEenheid,
            herrekenPerDag: catHerrekenPerDag
        });

        if (res.success) {
            alert("Kostencategorie toegevoegd!");
            setCatNaam('');
            setCatHerrekenPerDag(false);
            laadData();
        } else {
            alert(`Fout: ${res.error}`);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tarieven & Categorieën Beheer</h1>
                    <p className="text-xs text-slate-400 mt-1">Beheer je energiecontracten, gesplitste tarieven en netkost-categorieën</p>
                </div>
                <Link
                    href="/facturen"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-4 py-2 rounded-lg border border-slate-700 transition"
                >
                    ← Terug naar Facturen
                </Link>
            </div>

            {/* Tabs Navigatie */}
            <div className="flex border-b border-slate-800 gap-4">
                <button
                    onClick={() => setActieveTab('contracten')}
                    className={`pb-3 px-2 text-sm font-semibold transition border-b-2 ${actieveTab === 'contracten'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    ⚡ Energiecontracten & Tarieven ({contracten.length})
                </button>
                <button
                    onClick={() => setActieveTab('categorieen')}
                    className={`pb-3 px-2 text-sm font-semibold transition border-b-2 ${actieveTab === 'categorieen'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    🏷️ Kostencategorieën ({categorieen.length})
                </button>
            </div>

            {/* TAB 1: CONTRACTEN & GESPLITSTE TARIEVEN */}
            {actieveTab === 'contracten' && (
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
                                value={leverancier}
                                onChange={(e) => setLeverancier(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Contractnaam</label>
                            <input
                                type="text"
                                required
                                placeholder="bijv. Go Flex Variabel"
                                value={contractNaam}
                                onChange={(e) => setContractNaam(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Type</label>
                                <select
                                    value={contractType}
                                    onChange={(e) => setContractType(e.target.value as any)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                                >
                                    <option value="VAST">Vast</option>
                                    <option value="VARIABEL">Variabel</option>
                                    <option value="DYNAMISCH">Dynamisch</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Startdatum</label>
                                <input
                                    type="date"
                                    required
                                    value={startDatum}
                                    onChange={(e) => setStartDatum(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                                />
                            </div>
                        </div>

                        {/* Tarieven Invoeren */}
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                            <h3 className="text-xs font-semibold text-slate-300">Tarieven (€/kWh of €/jaar)</h3>

                            {/*tarieven.map((t, idx) => (
                                <div key={t.tariefTypeSleutel} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 gap-2">
                                    <span className="text-[11px] font-mono text-slate-400 w-28">{t.type}</span>
                                    <input
                                        step='0.000001'
                                        type='number'
                                        placeholder="0.0000"
                                        value={t.prijsPerEenheidstr || ''}
                                        onChange={(e) => {
                                            const kopie = [...tarieven];
                                            kopie[idx].prijsPerEenheidstr = e.target.value;
                                            setTarieven(kopie);
                                        }}
                                        onBlur={(e) => {
                                            const kopie = [...tarieven];
                                            kopie[idx].prijsPerEenheid = parseFloat(e.target.value) || 0;
                                            setTarieven(kopie);
                                        }}
                                        className="w-28 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-right font-mono"
                                    />
                                </div>
                            ))*/}
                        </div>

                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded text-sm transition">
                            Contract & Tarieven Opslaan
                        </button>
                    </form>

                    {/* Overzicht Contracten */}
                    <div className="lg:col-span-2 bg-slate-900 p-5 rounded-xl border border-slate-800">
                        <h2 className="text-lg font-bold text-white mb-4">Bestaande Contracten</h2>
                        <div className="space-y-4">
                            {contracten.length === 0 ? (
                                <p className="text-slate-500 text-sm">Nog geen contracten ingegeven.</p>
                            ) : (
                                contracten.map((c) => (
                                    <div key={c.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-emerald-400 text-base">{c.leverancier} - {c.contractNaam}</h3>
                                                <p className="text-xs text-slate-400">Type: {c.type} | Start: {new Date(c.startDatum).toLocaleDateString('nl-BE')}</p>
                                            </div>
                                            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">ID #{c.id}</span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-900">
                                            {c.tarieven?.map((t: any) => (
                                                <div key={t.id} className="bg-slate-900/60 p-2 rounded text-xs border border-slate-800">
                                                    <div className="text-[10px] text-slate-400 font-mono">{t.type}</div>
                                                    <div className="font-bold font-mono text-slate-200">€ {Number(t.prijsPerEenheid).toFixed(6)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: KOSTENCATEGORIEËN */}
            {actieveTab === 'categorieen' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <form onSubmit={handleCategorieSubmit} className="lg:col-span-1 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
                        <h2 className="text-lg font-bold text-emerald-400">Nieuwe Kostencategorie</h2>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Naam Categorie</label>
                            <input
                                type="text"
                                required
                                placeholder="bijv. Transmissie, Databeheer"
                                value={catNaam}
                                onChange={(e) => setCatNaam(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Type</label>
                            <select
                                value={catType}
                                onChange={(e) => setCatType(e.target.value as any)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            >
                                <option value="NETTARIEF">Nettarief</option>
                                <option value="HEFFING">Heffing / Bijdrage</option>
                                <option value="ENERGIE">Energiekost</option>
                                <option value="BTW">BTW</option>
                                <option value="KORTING">Korting</option>
                                <option value="DIVERS">Divers</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Eenheid</label>
                            <select
                                value={catEenheid}
                                onChange={(e) => setCatEenheid(e.target.value as any)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            >
                                <option value="KWH">per kWh</option>
                                <option value="KW_JAAR">per kW/jaar (Capaciteit)</option>
                                <option value="VAST_JAAR">Vast per Jaar</option>
                                <option value="MAAND">Vast per Maand</option>
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="VAST_BEDRAG">Vast Bedrag (€)</option>
                            </select>
                        </div>

                        {/* Vinkje toevoegen voor pro-rata / herrekenen per dag */}
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="herrekenPerDag"
                                checked={catHerrekenPerDag}
                                onChange={(e) => setCatHerrekenPerDag(e.target.checked)}
                                className="w-4 h-4 text-emerald-500 bg-slate-950 border-slate-700 rounded focus:ring-emerald-500"
                            />
                            <label htmlFor="herrekenPerDag" className="text-xs text-slate-300">
                                Vaste kost herrekenen per dag (pro-rata op basis van verbruiksperiode)
                            </label>
                        </div>

                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded text-sm transition">
                            Categorie Opslaan
                        </button>
                    </form>

                    <div className="lg:col-span-2 bg-slate-900 p-5 rounded-xl border border-slate-800">
                        <h2 className="text-lg font-bold text-white mb-4">Ingestelde Categorieën</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {categorieen.map((cat) => (
                                <div key={cat.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-slate-200 text-sm">{cat.naam}</div>
                                        <div className="text-xs text-slate-500">
                                            {cat.type} • {cat.eenheid} {cat.herrekenPerDag ? '• (Pro-rata)' : ''}
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                        #{cat.id}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}