// src/app/facturen/page.tsx
import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 0; // Altijd verse data ophalen

async function getContracten() {
    return await prisma.energieContract.findMany({
        include: {
            facturen: false,
            tarieven: {
                include: {
                    type: true,
                    contract: false
                },
            },
        },
        orderBy: {
            startDatum: 'desc',
        },
    });
}

export default async function ContractenOverzichtPage() {
    const contracten = await getContracten();

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header met Acties */}
            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
                <div>
                    <h1 className="text-2xl font-bold text-white">Contracten Overzicht</h1>
                    <p className="text-xs text-slate-400 mt-1">Beheer en bekijk al je ingegeven contracten</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/contracten/nieuw"
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition"
                    >
                        + Nieuw contract Invoeren
                    </Link>
                </div>
            </div>

            {/* Contracten Tabel */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                            <tr>
                                <th className="p-4">ContractId</th>
                                <th className="p-4">Startdatum</th>
                                <th className="p-4">Einddatum</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Leverancier</th>
                                <th className="p-4">Contract</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {contracten.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        Nog geen facturen ingegeven. Klik op "+ Nieuwe Factuur Invoeren" om te starten.
                                    </td>
                                </tr>
                            ) : (
                                contracten.map((f) => (
                                    <tr key={f.id} className="hover:bg-slate-800/50 transition">
                                        <td className="p-4 font-mono text-emerald-400 font-medium">
                                            {f.id || `#${f.id}`}
                                        </td>
                                        <td className="p-4 text-slate-200">
                                            {(f.startDatum ? new Date(f.startDatum).toLocaleDateString('nl-BE') : '-')}
                                        </td>
                                        <td className="p-4 text-slate-200">{(f.eindDatum ? new Date(f.eindDatum).toLocaleDateString('nl-BE') : '-')}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2 py-0.5 text-xs rounded font-semibold `}>
                                                {f.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-200">
                                            {f.leverancier}
                                        </td>
                                        <td className="p-4 text-slate-200">
                                            {f.contractNaam}
                                        </td>
                                        <td className="p-4 text-slate-200">
                                            <Link href={`/contracten/${f.id}`}
                                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition">Details</Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}