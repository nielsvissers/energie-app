// src/components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { syncHomeAssistantDagMetingen } from '@/actions/homeAssistantActions';

const navItems = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Contracten', href: '/contracten', icon: '🧾' },
  { name: 'Facturen', href: '/facturen', icon: '🧾' },
  { name: 'Metingen & Energie', href: '/verbruik', icon: '⚡' },
  { name: 'Batterij & Simulaties', href: '/simulaties', icon: '🔋' },
  { name: 'Investeringen & ROI', href: '/investeringen', icon: '📈' },
  { name: 'Instellingen', href: '/instellingen', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* App Logo / Header */}
        <div className="px-3 py-2 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-400 font-bold text-xl">
            ⚡
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">Energie Monitor</h1>
          </div>
        </div>

        {/* Navigatie Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Systeemstatus Footer */}
      <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Status App</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </span>
          <button onClick={() => syncHomeAssistantDagMetingen()} className="text-slate-500 hover:text-slate-300 text-xs">
            🔄 test
          </button>
        </div>
        <div className="text-[11px] text-slate-500">Proxmox / Portainer LXC</div>
      </div>
    </aside>
  );
}