// src/app/page.tsx
import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  try {
    // Haal aantal facturen en totaalbedrag van het huidige jaar op
    const huidigJaar = new Date().getFullYear();
    const facturen = await prisma.factuur.findMany({
      where: {
        factuurDatum: {
          gte: new Date(`${huidigJaar}-01-01`),
        },
      },
    });

    const totaalJaarKosten = facturen.reduce((sum, f) => sum + Number(f.totaalBedragInclBtw), 0);
    const aantalFacturen = facturen.length;

    return { totaalJaarKosten, aantalFacturen };
  } catch (e) {
    console.error("Fout bij ophalen dashboard data:", e);
    return { totaalJaarKosten: 0, aantalFacturen: 0 };
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welkom Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Energie Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Welkom terug! Bekijk hier het overzicht van je energiekosten, verbruik en simulaties.
        </p>
      </div>

      {/* KPI Overzichtskaarten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kaart 1: Factuurkosten */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Totale Energiekosten ({new Date().getFullYear()})
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            € {stats.totaalJaarKosten.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-2">Gebaseerd op {stats.aantalFacturen} ingegeven factuur/facturen</p>
          <div className="absolute top-4 right-4 text-2xl opacity-20">🧾</div>
        </div>

        {/* Kaart 2: Capaciteitstarief (Placeholder voor Metingen module) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Hoogste Maandpiek (Capaciteitstarief)
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400">
            -- kW
          </div>
          <p className="text-xs text-slate-500 mt-2">Koppel Home Assistant om live pieken te zien</p>
          <div className="absolute top-4 right-4 text-2xl opacity-20">⚡</div>
        </div>

        {/* Kaart 3: Batterij Simulatie Status */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Geschatte Batterij Besparing
          </div>
          <div className="text-3xl font-bold font-mono text-blue-400">
            -- / jaar
          </div>
          <p className="text-xs text-slate-500 mt-2">Draai een simulatie via de batterij-module</p>
          <div className="absolute top-4 right-4 text-2xl opacity-20">🔋</div>
        </div>
      </div>

      {/* Doorklik Snelkoppelingen (Modules) */}
      <div>
        <h2 className="text-xl font-bold text-slate-200 mb-4">Snelkoppelingen naar Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <Link 
            href="/facturen"
            className="group bg-slate-900 hover:bg-slate-800/80 p-5 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition shadow-md flex items-start gap-4"
          >
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 text-2xl group-hover:scale-110 transition">
              🧾
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-emerald-400 transition">Facturen Beheren</h3>
              <p className="text-xs text-slate-400 mt-1">
                Voer nieuwe energiefacturen in, bekijk het historisch overzicht en de opbouw van tarieven.
              </p>
            </div>
          </Link>

          <Link 
            href="/verbruik"
            className="group bg-slate-900 hover:bg-slate-800/80 p-5 rounded-xl border border-slate-800 hover:border-amber-500/40 transition shadow-md flex items-start gap-4"
          >
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 text-2xl group-hover:scale-110 transition">
              ⚡
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-amber-400 transition">Metingen & Live Verbruik</h3>
              <p className="text-xs text-slate-400 mt-1">
                Bekijk verbruiksgrafieken, injectie, zonne-energie en de kwartierpieken uit Home Assistant.
              </p>
            </div>
          </Link>

          <Link 
            href="/simulaties"
            className="group bg-slate-900 hover:bg-slate-800/80 p-5 rounded-xl border border-slate-800 hover:border-blue-500/40 transition shadow-md flex items-start gap-4"
          >
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 text-2xl group-hover:scale-110 transition">
              🔋
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition">Batterij Simulaties</h3>
              <p className="text-xs text-slate-400 mt-1">
                Bereken het effect van een thuisbatterij op je kwartierpieken en je totale jaarrekening.
              </p>
            </div>
          </Link>

          <Link 
            href="/instellingen"
            className="group bg-slate-900 hover:bg-slate-800/80 p-5 rounded-xl border border-slate-800 hover:border-purple-500/40 transition shadow-md flex items-start gap-4"
          >
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 text-2xl group-hover:scale-110 transition">
              ⚙️
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-purple-400 transition">Instellingen & Integraties</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configureer je Home Assistant API-tokens, netbeheerder (Vlaanderen) en tariefparameters.
              </p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}