'use client';

import React, { useState, useEffect } from 'react';
import {
    getMaandProductiePerJaar,
    getJaarProductieTotaal,
    getDynamischeElektriciteitsStromen,
} from '@/actions/grafiekActions';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import DagMetingModal from '@/components/DagMetingModal'; // Pas het pad aan naar wens
import { useRouter } from 'next/navigation'; // 1. Importeer useRouter

const JAAR_KLEUREN = [
'#3b82f6', // 2020: Blauw
  '#f97316', // 2021: Oranje
  '#10b981', // 2022: Smaragdgroen
  '#eab308', // 2023: Geel
  '#a855f7', // 2024: Paars
  '#ec4899', // 2025: Roze
  '#06b6d4', // 2026: Cyaan / Lichtblauw (Zeer goed zichtbaar!)
  '#f43f5e', // 2027: Rood
  '#84cc16', // 2028: Limegroen
];

export default function VerbruikPage() {
    const [filterType, setFilterType] = useState<'WEEK' | 'MAAND' | 'JAAR' | 'ALLES' | 'CUSTOM'>('ALLES');
    const [startDatum, setStartDatum] = useState<string>('');
    const [eindDatum, setEindDatum] = useState<string>('');

    const [maandData, setMaandData] = useState<any[]>([]);
    const [jaarData, setJaarData] = useState<any[]>([]);
    const [stroomData, setStroomData] = useState<any[]>([]);
    const [barConfigs, setBarConfigs] = useState<{ key: string; fill: string }[]>([]);
    const [jaren, setJaren] = useState<number[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter(); // 2. Initialiseer router


    const handleFilterChange = (type: 'WEEK' | 'MAAND' | 'JAAR' | 'ALLES' | 'CUSTOM') => {
        setFilterType(type);
        const nu = new Date();

        if (type === 'WEEK') {
            const weekGeleden = new Date();
            weekGeleden.setDate(nu.getDate() - 7);
            setStartDatum(weekGeleden.toISOString().slice(0, 10));
            setEindDatum(nu.toISOString().slice(0, 10));
        } else if (type === 'MAAND') {
            const maandGeleden = new Date();
            maandGeleden.setMonth(nu.getMonth() - 1);
            setStartDatum(maandGeleden.toISOString().slice(0, 10));
            setEindDatum(nu.toISOString().slice(0, 10));
        } else if (type === 'JAAR') {
            const beginJaar = new Date(nu.getFullYear(), 0, 1);
            setStartDatum(beginJaar.toISOString().slice(0, 10));
            setEindDatum(nu.toISOString().slice(0, 10));
        } else if (type === 'ALLES') {
            setStartDatum('');
            setEindDatum('');
        }
    };


    async function fetchData() {
        setLoading(true);
        const [maandRes, jaarRes, stroomRes] = await Promise.all([
            getMaandProductiePerJaar("", ""),
            getJaarProductieTotaal("", ""),
            getDynamischeElektriciteitsStromen(startDatum, eindDatum),
        ]);

        setMaandData(maandRes.chartData);
        setJaren(maandRes.jaren);
        setJaarData(jaarRes);
        setStroomData(stroomRes.chartData);
        setBarConfigs(stroomRes.barConfigs);
        setLoading(false);
    }

    useEffect(() => {
        fetchData();
    }, [startDatum, eindDatum]);

    async function handleSuccess() {
        // 3. Ververs de pagina data
        await fetchData();
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 text-slate-100">
            {/* FILTER BAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div>
                    <h1 className="text-xl font-bold text-emerald-400">📊 Verbruik & Productie Dashboard</h1>
                    <p className="text-xs text-slate-400">Tijdspanne selecteren voor alle onderstaande grafieken</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {(['WEEK', 'MAAND', 'JAAR', 'ALLES', 'CUSTOM'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => handleFilterChange(type)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filterType === type
                                ? 'bg-emerald-500 text-slate-950 shadow-md'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                        >
                            {type === 'WEEK' && 'Afgelopen Week'}
                            {type === 'MAAND' && 'Afgelopen Maand'}
                            {type === 'JAAR' && 'Dit Jaar'}
                            {type === 'ALLES' && 'Alles'}
                            {type === 'CUSTOM' && 'Aangepast'}
                        </button>
                    ))}

                    {filterType === 'CUSTOM' && (
                        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 ml-2">
                            <input
                                type="date"
                                value={startDatum}
                                onChange={(e) => setStartDatum(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white outline-none"
                            />
                            <span className="text-slate-500 text-xs">tot</span>
                            <input
                                type="date"
                                value={eindDatum}
                                onChange={(e) => setEindDatum(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white outline-none"
                            />
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg"
                    >
                        + Nieuwe Meting Invoeren
                    </button>

                    <DagMetingModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSuccess={() => {
                            handleSuccess();
                        }}
                    />
                </div>
            </div>

            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* GRAFIEK 1: Productie per maand per jaar */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col justify-between">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-2">
                        <div>
                            <h2 className="text-sm font-bold text-slate-200">☀️ Dagproductie per Maand</h2>
                            <p className="text-[11px] text-slate-400">Gegroepeerd per jaar</p>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                            kWh
                        </span>
                    </div>

                    {loading ? (
                        <div className="h-72 flex items-center justify-center text-slate-500 text-xs">Grafiek laden...</div>
                    ) : (
                        <div className="h-72 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={maandData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="10%" barGap="1" >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                                    <XAxis dataKey="maand" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                                    {jaren.map((jaar, index) => (
                                        <Bar
                                            key={jaar}
                                            dataKey={jaar}
                                            name={`${jaar}`}
                                            fill={JAAR_KLEUREN[index % JAAR_KLEUREN.length]}
                                            radius={[2, 2, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* GRAFIEK 2: Totale productie per jaar */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col justify-between">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-2">
                        <div>
                            <h2 className="text-sm font-bold text-slate-200">📈 Totale Productie per Jaar</h2>
                            <p className="text-[11px] text-slate-400">Totale som over alle jaren</p>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                            kWh
                        </span>
                    </div>

                    {loading ? (
                        <div className="h-72 flex items-center justify-center text-slate-500 text-xs">Grafiek laden...</div>
                    ) : (
                        <div className="h-72 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={jaarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                                    <XAxis dataKey="jaar" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="totaal"
                                        name="Totaal"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* GRAFIEK 3: Elektriciteitsstromen (Home Assistant Stijl) */}
                {/* GRAFIEK 3: Dynamische Elektriciteitsstromen */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col justify-between lg:col-span-2">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-2">
                        <div>
                            <h2 className="text-sm font-bold text-slate-200">⚡ Elektriciteitsstromen (Dynamisch)</h2>
                            <p className="text-[11px] text-slate-400">Automatische verwerking van alle aanwezige metingtypes</p>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                            kWh
                        </span>
                    </div>

                    {loading ? (
                        <div className="h-80 flex items-center justify-center text-slate-500 text-xs">Grafiek laden...</div>
                    ) : (
                        <div className="h-80 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stroomData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} stackOffset='sign'>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                                    <XAxis dataKey="datumLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                                        formatter={(value: any) => [`${Math.abs(Number(value))} kWh`, '']}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                                    <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />

                                    {/* Render staven dynamisch op basis van de database-inhoud */}
                                    {/*<Bar key={bar.key} dataKey={bar.key} name={bar.key} stackId="stroom" fill={bar.fill} />*/}
                                    {barConfigs.map((bar) => (

                                        <Bar key={bar.key} dataKey={bar.key}
                                            name={bar.key}
                                            fill={bar.fill}
                                            stackId="stroom"
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}