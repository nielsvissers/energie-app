'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Contract, ContractWithTarieven } from '@/types/Contract';
import { getContractMetTarieven, opslaanContract, UpdateContract } from '@/actions/contractenActions';
import TariefModal from '@/components/ContractTariefModal';
import { Prisma, TariefType } from '@prisma/client';
import { parseContractType } from '@/lib/conversion';

// --- HOOFDPAGINA ---
export default function DetailsContractPage() {
  const params = useParams();
  const router = useRouter();
  const [contract, setContract] = useState<Prisma.EnergieContractGetPayload<{ include: { tarieven: { include: { type: true } } } }> | null>();
  const [isModalOpen, setIsModalOpen] = useState(false);


  useEffect(() => {
    async function init() {
      const foundContract = await getContractMetTarieven(Number(params.id));
      if (foundContract) {
        setContract(foundContract);
      }
    }
    init();
  }, []);

  const handleTariefToevoegen = (nieuwTarief: any) => {
    setContract((prev) => {
      // Als er nog geen contract is, maak er een aan met de basiswaarden
      if (!prev) {
        return {
          id: 0,
          leverancier: '',
          contractNaam: '',
          type: 'VAST',
          startDatum: new Date(),
          eindDatum: new Date(),
          tarieven: [nieuwTarief],
        };
      }

      // Als prev wel bestaat, pas de tarieven aan
      return {
        ...prev,
        tarieven: [...prev.tarieven, nieuwTarief],
      };
    });

  };

  const handleVerwijderTarief = (index: number) => {
    setContract((prev) => {
      if (!prev) {
        return {
          id: 0,
          leverancier: '',
          contractNaam: '',
          type: 'VAST',
          startDatum: new Date(),
          eindDatum: new Date(),
          tarieven: [],
        };
      }
      return {
        ...prev,
        tarieven: prev.tarieven.filter((_, i) => i !== index),
      }
    });
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (contract) {

      const res = await UpdateContract(contract as Contract);

      if (res.success) {
        alert('Contract & tarieven succesvol opgeslagen!');
        router.push('/contracten');
      } else {
        alert(`Fout bij opslaan: ${res.error}`);
      }
    }
  };

  return (<>
    {contract &&
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Formulier nieuw contract */}
        <form onSubmit={handleContractSubmit} className="lg:col-span-1 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-emerald-400">Details Contract</h2>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Leverancier</label>
            <input
              type="text"
              required
              placeholder="bijv. Eneco, Engie, Bolt"
              value={contract.leverancier}
              onChange={(e) => setContract({ ...contract, leverancier: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Contractnaam</label>
            <input
              type="text"
              required
              placeholder="bijv. Go Flex Variabel"
              value={contract.contractNaam}
              onChange={(e) => setContract({ ...contract, contractNaam: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select
              value={contract.type}
              onChange={(e) => setContract({ ...contract, type: parseContractType(e.target.value) })}
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
                value={contract.startDatum.toISOString().slice(0, 10)}
                onChange={(e) => setContract({ ...contract, startDatum: new Date(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Einddatum</label>
              <input
                type="date"
                required
                value={contract.eindDatum?.toISOString().slice(0, 10)}
                onChange={(e) => setContract({ ...contract, eindDatum: new Date(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded text-sm transition mt-4">
            Contract & Tarieven bijwerken
          </button>
        </form>

        {/* Overzicht Toegevoegde Tarieven */}
        <div className="lg:col-span-3">
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
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">BTW-percentage</th>
                    <th className="p-3">Prijs Excl BTW</th>
                    <th className="p-3">Prijs Incl BTW</th>
                    <th className="p-3">Eigenschappen</th>
                    <th className="p-3">Geldig Van</th>
                    <th className="p-3">Geldig Tot</th>
                    <th className="p-3 text-center">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {contract.tarieven.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                        Nog geen tarieven toegevoegd. Klik op "+ Tarief toevoegen" om tarieven aan dit contract te koppelen.
                      </td>
                    </tr>
                  ) : (
                    contract.tarieven.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 font-medium text-emerald-400">{t.type !== undefined ? t.type.waarde : ''}</td>
                        <td className="p-3 font-mono text-slate-200">
                          {t.btwPercentage.toString()}%
                        </td>
                        <td className="p-3 font-mono text-slate-200">
                          € {t.prijsPerEenheidExclBtw.toString()}
                        </td>
                        <td className="p-3 font-mono text-slate-200">
                          € {t.prijsPerEenheidInclBtw.toString()}
                        </td>
                        <td className="p-3 text-slate-400 space-x-1">
                          {t.herrekenPerDag && <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Herrekend Per Dag</span>}
                        </td>
                        <td className="p-3 text-slate-400 space-x-1">
                          {t.geldigVan.toLocaleDateString()}
                        </td>
                        <td className="p-3 text-slate-400 space-x-1">
                          {t.geldigTot?.toLocaleDateString() ?? '-'}
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
    }</>
  );
}