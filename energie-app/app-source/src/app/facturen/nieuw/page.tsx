'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getKostencategorieen } from '@/actions/categorieenActions';
import { getContractenMetTarieven } from '@/actions/contractenActions';
import { opslaanFactuur } from '@/actions/facturenActions';
import { DecimalInput } from '@/components/inputs/DecimalInput';
import { RoundTo } from '@/lib/round';


import { FactuurLijn } from '@/types/FactuurLijn';
import { Factuur } from '@/types/Factuur';
import { FactuurType } from '@/types/FactuurType';
import { Contract } from '@/types/Contract';
import { ContractTarief } from '@/types/ContractTarief';




export default function NieuweFactuurPage() {
    const router = useRouter();
    const [contracten, setContracten] = useState<Contract[]>([]);
    const [categorieen, setCategorieen] = useState<any[]>([]);

    const [factuur, setFactuur] = useState<Partial<Factuur>>({});
    const [lijnen, setLijnen] = useState<Partial<FactuurLijn>[]>([]);

    useEffect(() => {
        async function init() {
            const cats = await getKostencategorieen();
            const cons = await getContractenMetTarieven();
            setCategorieen(cats);
            setContracten(cons);

            // Eerste lijn standaard toevoegen
            if (cats && cats.length > 0) {
                setLijnen([{
                    kostencategorieId: cats[0].id,
                    omschrijving: cats[0].naam
                }]);
            }
        }
        init();
    }, []);

    // Helper voor veilige conversie van getallen (ondersteunt komma's)
    const parseInputValue = (val: string): number => {
        if (!val) return 0;
        const sanitized = val.replace(',', '.');
        const num = parseFloat(sanitized);
        return isNaN(num) ? 0 : num;
    };

    // Automatische berekening van het aantal dagen in de gekozen periode
    const berekenAantalDagen = () => {
        if (!factuur.startDatum || !factuur.eindDatum) return 0;
        const start = factuur.startDatum;
        const eind = factuur.eindDatum;
        const verschilTijd = eind.getTime() - start.getTime();
        const dagen = Math.ceil(verschilTijd / (1000 * 3600 * 24));
        return dagen > 0 ? dagen : 0;
    };

    const aantalDagen = berekenAantalDagen();

    // Vul automatisch factuurlijnen in op basis van het gekozen contract
    const handleContractChange = (contractId: number) => {
        setFactuur((prev) => {
            if (!prev) {
                return { contractId: contractId };
            }
            else {
                return { ...prev, contractId: contractId };
            }
        });
        const contract = contracten.find(c => c.id === contractId);

        if (contract && contract.tarieven && contract.tarieven.length > 0) {
            const energieCat = categorieen.find(c => c.type === 'ENERGIE') || categorieen[0];
            const nieuweLijnen: Partial<FactuurLijn>[] = contract.tarieven.map((t: ContractTarief) => {
                let temp: Partial<FactuurLijn> = {
                    omschrijving: t.type.beschrijving,
                    btwPercentage: Number(t.btwPercentage) || 0,
                    eenheidsprijs: Number(t.prijsPerEenheidExclBtw),
                    herrekenPerDag: t.herrekenPerDag,
                    kostencategorieId: energieCat ? energieCat.id : 1,
                    tariefTypeId: t.tariefTypeId,
                    type: t.type
                };

                return (temp);
            });

            setLijnen(nieuweLijnen);
        }
    };

    function berekenLijnTotaal(lijn: FactuurLijn) {
        const dagVerbruik = factuur.verbruikDag || 0;
        const nachtVerbruik = factuur.verbruikNacht || 0;
        const exclnachtVerbruik = factuur.verbruikExclNacht || 0;
        const dagInjectie = factuur.injectieDag || 0;
        const nachtInjectie = factuur.injectieNacht || 0;
        const piekvermogen = factuur.piekvermogen || 0;
        if (lijn.type) {
            if (lijn.type.sleutel === 'VASTE_VERGOEDING' || lijn.type.sleutel === 'DISTRIBUTIE_VAST_TERM') {
                if (lijn.herrekenPerDag && aantalDagen > 0) {
                    const prijsPerDag = RoundTo((Number(lijn.eenheidsprijs) || 0) / 365, 4);
                    const excl = RoundTo(prijsPerDag * aantalDagen, 2);
                    const btw = excl * (lijn.btwPercentage / 100);
                    lijn.hoeveelheid = aantalDagen;
                    lijn.bedragExclBtw = excl;
                    lijn.bedragInclBtw = excl + btw;
                    return { excl, btw, incl: excl + btw, hoeveelheid: aantalDagen };
                } else {
                    lijn.hoeveelheid = 1;
                }
            } else if (lijn.type.sleutel === 'PROSUMENTENTARIEF') {
                const prijsPerDag = (Number(lijn.eenheidsprijs) || 0) * 6.6 / 365;
                const excl = RoundTo(prijsPerDag * 21.145, 2);
                const btw = excl * (lijn.btwPercentage / 100);
                lijn.hoeveelheid = aantalDagen;
                lijn.bedragExclBtw = excl;
                lijn.bedragInclBtw = excl + btw;
                return { excl, btw, incl: excl + btw, hoeveelheid: 6.6 };
            } else if (lijn.type.sleutel === 'CAPACITEITSTARIEF') {
                const prijsPerDag = (Number(lijn.eenheidsprijs) || 0) * piekvermogen / 365;
                const excl = RoundTo(prijsPerDag * aantalDagen, 2);
                const btw = excl * (lijn.btwPercentage / 100);
                lijn.hoeveelheid = piekvermogen;
                lijn.bedragExclBtw = excl;
                lijn.bedragInclBtw = excl + btw;
                return { excl, btw, incl: excl + btw, hoeveelheid: piekvermogen };
            } else if (lijn.type.sleutel === 'DATABEHEER') {
                const prijsPerDag = (Number(lijn.eenheidsprijs) || 0) / 365;
                const excl = RoundTo(prijsPerDag * aantalDagen, 2);
                const btw = excl * (lijn.btwPercentage / 100);
                lijn.hoeveelheid = aantalDagen;
                lijn.bedragExclBtw = excl;
                lijn.bedragInclBtw = excl + btw;
                return { excl, btw, incl: excl + btw, hoeveelheid: aantalDagen };
            } else if (lijn.type.sleutel === 'ENERGIEFONDS') {
                const prijsPerDag = RoundTo((Number(lijn.eenheidsprijs) || 0) * 12 / 365, 6);
                const excl = RoundTo(prijsPerDag * aantalDagen, 2);
                const btw = excl * (lijn.btwPercentage / 100);
                lijn.hoeveelheid = aantalDagen;
                lijn.bedragExclBtw = excl;
                lijn.bedragInclBtw = excl + btw;
                return { excl, btw, incl: excl + btw, hoeveelheid: aantalDagen };
            }


            else {
                if (lijn.type.sleutel === 'PRIJS_AFNAME_PIEK' || lijn.type.sleutel === 'DISTRIBUTIE_PIEK') {
                    lijn.hoeveelheid = dagVerbruik;
                } else if (lijn.type.sleutel === 'PRIJS_INJECTIE_PIEK') {
                    lijn.hoeveelheid = -dagInjectie;
                } else if (lijn.type.sleutel === 'PRIJS_AFNAME_DAL' || lijn.type.sleutel === 'DISTRIBUTIE_DAL') {
                    lijn.hoeveelheid = nachtVerbruik;
                } else if (lijn.type.sleutel === 'PRIJS_INJECTIE_DAL') {
                    lijn.hoeveelheid = -nachtInjectie;
                } else if (lijn.type.sleutel === 'PRIJS_AFNAME_EXCL_NACHT' || lijn.type.sleutel === 'DISTRIBUTIE_EXCL_NACHT') {
                    lijn.hoeveelheid = exclnachtVerbruik;
                } else {
                    // Indien geen dag/nacht opsplitsing of handmatig: gebruik totaal van dag + nacht of handmatige hoeveelheid
                    lijn.hoeveelheid = (dagVerbruik + nachtVerbruik + exclnachtVerbruik) || lijn.hoeveelheid || 0;
                }
            }
        }

        const effectievePrijsInEuro = RoundTo(Number(lijn.eenheidsprijs?.toFixed(4)) || 0, 6);
        const excl = RoundTo(lijn.hoeveelheid * effectievePrijsInEuro, 2);
        const btw = excl * (lijn.btwPercentage / 100);

        //lijn.hoeveelheid = aantalDagen;
        lijn.bedragExclBtw = excl;
        lijn.bedragInclBtw = excl + btw;
        return { excl, btw, incl: excl + btw, hoeveelheid: lijn.hoeveelheid };
    };

    const totaalExcl = lijnen.reduce((acc, l) => acc + berekenLijnTotaal(l as FactuurLijn).excl, 0);
    const totaalBtw = lijnen.reduce((acc, l) => acc + berekenLijnTotaal(l as FactuurLijn).btw, 0);
    const totaalIncl = totaalExcl + totaalBtw;

    const voegLijnToe = () => {
        const eersteCat = categorieen[0];
        setLijnen([...lijnen, {
            kostencategorieId: eersteCat ? eersteCat.id : 1
        }]);
    };

    const verwijderLijn = (index: number) => {
        setLijnen(lijnen.filter((_, i) => i !== index));
    };

    const updateLijn = (index: number, field: keyof FactuurLijn, value: any) => {
        const nieuweLijnen = [...lijnen];
        nieuweLijnen[index] = { ...nieuweLijnen[index], [field]: value };
        setLijnen(nieuweLijnen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        factuur.totaalBedragExclBtw = totaalExcl;
        factuur.totaalBedragInclBtw = totaalIncl;
        factuur.totaalBtwBedrag = totaalBtw;
        factuur.lijnen = lijnen as FactuurLijn[];

        const res = await opslaanFactuur(factuur);

        if (res.success) {
            alert("Factuur succesvol opgeslagen in MariaDB!");
            router.push('/facturen');
        } else {
            alert(`Fout bij opslaan: ${res.error}`);
        }
    }

    return (
        <div className="max-w-5xl mx-auto p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h1 className="text-2xl font-bold text-emerald-400">Nieuwe Energiefactuur Invoeren</h1>
                <Link href="/facturen" className="text-xs text-slate-400 hover:text-white">✕ Annuleren</Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Kop-gegevens */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Koppel aan Contract</label>
                        <select
                            value={factuur.contractId?.toString()}
                            onChange={(e) => handleContractChange(parseInt(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                        >
                            <option value="">-- Geen / Vaste Taksen --</option>
                            {contracten.map(c => (
                                <option key={c.id} value={c.id}>{c.leverancier} - {c.contractNaam}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Factuurnummer</label>
                        <input
                            type="text"
                            value={factuur.factuurnummer ?? ''}
                            onChange={(e) => setFactuur({ ...factuur, factuurnummer: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                            placeholder="bijv. INV-2026-001"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Factuurtype</label>
                        <select
                            value={factuur.factuurType}
                            onChange={(e) => setFactuur({ ...factuur, factuurType: e.target.value as FactuurType })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                        >
                            <option value="VOORSCHOT">Voorschot</option>
                            <option value="AFREKENING">Jaarafrekening / Slotfactuur</option>
                            <option value="SLOTFACTUUR">Slotfactuur</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Factuurdatum</label>
                        <input
                            type="date"
                            required
                            value={factuur.factuurDatum ? factuur.factuurDatum.toISOString().slice(0, 10) : ''}
                            onChange={(e) => setFactuur({ ...factuur, factuurDatum: e.target.value ? new Date(e.target.value) : undefined })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Periode Van</label>
                        <input
                            type="date"
                            required
                            value={factuur.startDatum ? factuur.startDatum.toISOString().slice(0, 10) : ''}
                            onChange={(e) => setFactuur({ ...factuur, startDatum: e.target.value ? new Date(e.target.value) : undefined })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Periode Tot</label>
                        <input
                            type="date"
                            required
                            value={factuur.eindDatum ? factuur.eindDatum.toISOString().slice(0, 10) : ''}
                            onChange={(e) => setFactuur({ ...factuur, eindDatum: e.target.value ? new Date(e.target.value) : undefined })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                </div>

                {/* Algemene Invoer Verbruik (Slechts 1x ingeven) */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-bold text-emerald-400">⚡ Algemeen Verbruik voor Factuur</h3>
                        {aantalDagen > 0 && (
                            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
                                📅 Periode: <strong className="text-white">{aantalDagen} dagen</strong>
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Aantal kWh (Dag / Piek)</label>
                            <input
                                type="text"
                                placeholder="bijv. 1250"
                                value={factuur.verbruikDag}
                                onChange={(e) => setFactuur({ ...factuur, verbruikDag: parseInt(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-emerald-300 font-mono font-bold focus:border-emerald-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Aantal kWh (Nacht / Dal)</label>
                            <input
                                type="text"
                                placeholder="bijv. 950"
                                value={factuur.verbruikNacht}
                                onChange={(e) => setFactuur({ ...factuur, verbruikNacht: parseInt(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-emerald-300 font-mono font-bold focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Aantal kWh ( Excl Nacht)</label>
                            <input
                                type="text"
                                placeholder="bijv. 950"
                                value={factuur.verbruikExclNacht}
                                onChange={(e) => setFactuur({ ...factuur, verbruikExclNacht: parseInt(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-emerald-300 font-mono font-bold focus:border-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Aantal kWh injectie (Dag / Piek)</label>
                            <input
                                type="text"
                                placeholder="bijv. 1250"
                                value={factuur.injectieDag}
                                onChange={(e) => setFactuur({ ...factuur, injectieDag: parseInt(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-emerald-300 font-mono font-bold focus:border-emerald-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Aantal kWh injectie(Nacht / Dal)</label>
                            <input
                                type="text"
                                placeholder="bijv. 950"
                                value={factuur.injectieNacht}
                                onChange={(e) => setFactuur({ ...factuur, injectieNacht: parseInt(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-emerald-300 font-mono font-bold focus:border-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <DecimalInput label='Piekvermogen' onChange={(e) => setFactuur({ ...factuur, piekvermogen: e })} value={factuur.piekvermogen} onBlur={(e) => { }} />
                        </div>
                    </div>
                </div>

                {/* Factuurlijnen Tabel */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-200">Factuurlijnen (Gesplitste Tarieven & Taksen)</h2>
                        <button
                            type="button"
                            onClick={voegLijnToe}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition font-medium"
                        >
                            + Extra Lijn Toevoegen
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="p-3 w-48">Categorie</th>
                                    <th className="p-3">Omschrijving</th>
                                    <th className="p-3 w-36 text-right">Hoeveelheid</th>
                                    <th className="p-3 w-32">Eenheidsprijs (€)</th>
                                    <th className="p-3 w-20">BTW %</th>
                                    <th className="p-3 w-28 text-right">Subtotaal (€)</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                                {lijnen.map((lijn, idx) => {
                                    const b = berekenLijnTotaal(lijn as FactuurLijn);
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                                            <td className="p-2">
                                                <select
                                                    value={lijn.kostencategorieId}
                                                    onChange={(e) => updateLijn(idx, 'kostencategorieId', parseInt(e.target.value))}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white outline-none focus:border-emerald-500"
                                                >
                                                    {categorieen.map(c => (
                                                        <option key={c.id} value={c.id}>{c.naam}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={lijn.omschrijving?.toString()}
                                                    onChange={(e) => updateLijn(idx, 'omschrijving', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white outline-none focus:border-emerald-500"
                                                    placeholder="bijv. Afname Dag"
                                                />
                                            </td>
                                            <td className="p-2 font-mono text-slate-300 text-right">
                                                {lijn.type && (lijn.type.sleutel === 'VASTE_VERGOEDING' || lijn.type.sleutel === 'DISTRIBUTIE_VAST_TERM') && lijn.herrekenPerDag ? (
                                                    <span>
                                                        {lijn.hoeveelheid} dg ({((Number(lijn.eenheidsprijs) || 0) / 365).toFixed(4)} €/dag)
                                                    </span>
                                                ) :
                                                    lijn.type && lijn.type.sleutel === 'ENERGIEFONDS' && lijn.herrekenPerDag ? (
                                                        <span>
                                                            {aantalDagen} dg ({((Number(lijn.eenheidsprijs) || 0) * 12 / 365).toFixed(4)} €/dag)
                                                        </span>
                                                    ) : (
                                                        <span>{b.hoeveelheid} kWh</span>
                                                    )}
                                            </td>
                                            <td className="p-2">
                                                <DecimalInput label='' onChange={(e) => updateLijn(idx, 'eenheidsprijs', e || 0)} value={lijn.eenheidsprijs} onBlur={(e) => { }} />
                                            </td>
                                            <td className="p-2">
                                                {lijn.btwPercentage}
                                                <select
                                                    value={lijn.btwPercentage}
                                                    onChange={(e) => updateLijn(idx, 'btwPercentage', parseFloat(e.target.value))}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white outline-none focus:border-emerald-500"
                                                >
                                                    <option value={0}>0%</option>
                                                    <option value={6}>6%</option>
                                                    <option value={21}>21%</option>
                                                </select>
                                            </td>
                                            <td className="p-2 text-right text-slate-300 font-mono font-bold">
                                                € {b.incl.toFixed(2)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => verwijderLijn(idx)}
                                                    className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1"
                                                    title="Verwijder lijn"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totalen */}
                <div className="flex justify-end pt-4 border-t border-slate-800">
                    <div className="w-64 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-400">
                            <span>Totaal Excl. BTW:</span>
                            <span className="font-mono">€ {totaalExcl.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span>BTW Bedrag:</span>
                            <span className="font-mono">€ {totaalBtw.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-emerald-400 pt-2 border-t border-slate-700">
                            <span>Totaal Incl. BTW:</span>
                            <span className="font-mono">€ {totaalIncl.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-3 rounded-lg transition"
                >
                    Factuur Opslaan in MariaDB
                </button>
            </form>
        </div>
    );
}