// src/app/facturen/page.tsx
import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 0; // Altijd verse data ophalen

async function getFacturen() {
  return await prisma.factuur.findMany({
    include: {
      contract: true,
      lijnen: {
        include: {
          kostencategorie: true,
        },
      },
    },
    orderBy: {
      factuurDatum: 'desc',
    },
  });
}

export default async function FacturenOverzichtPage() {
  const facturen = await getFacturen();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header met Acties */}
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturen Overzicht</h1>
          <p className="text-xs text-slate-400 mt-1">Beheer en bekijk al je ingegeven energiefacturen</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/facturen/tarieven" 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-4 py-2 rounded-lg border border-slate-700 transition"
          >
            Tarieven & Categorieën
          </Link>
          <Link 
            href="/facturen/nieuw" 
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition"
          >
            + Nieuwe Factuur Invoeren
          </Link>
        </div>
      </div>

      {/* Facturen Tabel */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-4">Factuurnr</th>
                <th className="p-4">Datum</th>
                <th className="p-4">Periode</th>
                <th className="p-4">Type</th>
                <th className="p-4">Leverancier</th>
                <th className="p-4 text-right">Excl. BTW</th>
                <th className="p-4 text-right">BTW</th>
                <th className="p-4 text-right">Totaal Incl.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {facturen.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Nog geen facturen ingegeven. Klik op "+ Nieuwe Factuur Invoeren" om te starten.
                  </td>
                </tr>
              ) : (
                facturen.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4 font-mono text-emerald-400 font-medium">
                      {f.factuurnummer || `#${f.id}`}
                    </td>
                    <td className="p-4">
                      {new Date(f.factuurDatum).toLocaleDateString('nl-BE')}
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {new Date(f.startDatum).toLocaleDateString('nl-BE')} - {new Date(f.eindDatum).toLocaleDateString('nl-BE')}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded font-semibold ${
                        f.factuurType === 'AFREKENING' 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {f.factuurType}
                      </span>
                    </td>
                    <td className="p-4 text-slate-200">
                      {f.contract?.leverancier || 'Onbekend / Vaste Taksen'}
                    </td>
                    <td className="p-4 text-right font-mono">
                      € {Number(f.totaalBedragExclBtw).toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono text-slate-400">
                      € {Number(f.totaalBtwBedrag).toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      € {Number(f.totaalBedragInclBtw).toFixed(2)}
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