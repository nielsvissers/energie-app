'use server';

import { db } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { Factuur } from '@/types/Factuur';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ContractTarief, FactuurLijn as PrismaFactuurLijn, Prisma, Factuur as PrismaFactuur } from "@prisma/client";
import { time } from 'console';
import { parseFactuurType } from '@/lib/conversion';
import { GSP_NO_RETURNED_VALUE } from 'next/dist/lib/constants';


export interface FactuurLijnInput {
  kostencategorieId: number;
  omschrijving: string;
  hoeveelheid: number;
  eenheidsprijs: number;
  btwPercentage: number;
}

export interface FactuurInput {
  contractId: number | null;
  factuurnummer: string;
  factuurDatum: string;
  startDatum: string;
  eindDatum: string;
  injectieDag: string;
  injectieNacht: string;
  verbruikNacht: string;
  verbruikDag: string;
  verbruikExclNacht: string;
  factuurType: 'VOORSCHOT' | 'AFREKENING' | 'SLOTFACTUUR';
  lijnen: FactuurLijnInput[];
}

/**
 * Slaat een volledige factuur op inclusief de factuurlijnen
 */
export async function opslaanFactuur(factuur: Partial<Factuur>) {
  let savedFactuur: Factuur;
  try {
    if (factuur.id !== undefined) {
      //update contract
      savedFactuur = await prisma.factuur.update({
        where: { id: factuur.id },
        data: factuur as PrismaFactuur
      }) as Factuur;
      if (factuur.lijnen) {
        for (const t of factuur.lijnen) {
          t.factuurId = savedFactuur.id;
          if (t.id !== undefined) {
            await prisma.factuurLijn.update({
              where: { id: t.id },
              data: t as PrismaFactuurLijn
            })
          }
          else {
            await prisma.factuurLijn.create({
              data: t as PrismaFactuurLijn
            })
          }
        }
      }
    }
    else {
      if (factuur.eindDatum && factuur.factuurDatum && factuur.factuurType && factuur.startDatum && factuur.totaalBedragExclBtw && factuur.totaalBedragInclBtw && factuur.totaalBtwBedrag) {
        savedFactuur = await prisma.factuur.create({
          data: {
            eindDatum: factuur.eindDatum,
            factuurDatum: factuur.factuurDatum,
            factuurType: parseFactuurType(factuur.factuurType),
            startDatum: factuur.startDatum,
            totaalBedragExclBtw: factuur.totaalBedragExclBtw,
            totaalBedragInclBtw: factuur.totaalBedragInclBtw,
            totaalBtwBedrag: factuur.totaalBtwBedrag,
            contractId: factuur.contractId,
            factuurnummer: factuur.factuurnummer,
            injectieDag: factuur.injectieDag,
            injectieNacht: factuur.injectieNacht,
            verbruikDag: factuur.verbruikDag,
            verbruikExclNacht: factuur.verbruikExclNacht,
            verbruikNacht: factuur.verbruikNacht
          }
        }) as Factuur;
        if (factuur.lijnen) {
          for (const t of factuur.lijnen) {
            t.factuurId = savedFactuur.id;
            if (t.id !== undefined) {
              await prisma.factuurLijn.update({
                where: { id: t.id },
                data: t as PrismaFactuurLijn
              })
            }
            else {
              await prisma.factuurLijn.create({
                data:
                {
                  bedragExclBtw: t.bedragExclBtw!,
                  bedragInclBtw: t.bedragInclBtw!,
                  eenheidsprijs: t.eenheidsprijs!,
                  hoeveelheid: t.hoeveelheid,
                  btwPercentage: t.btwPercentage,
                  factuurId: t.factuurId,
                  kostencategorieId: t.kostencategorieId??1,
                  tariefTypeId: t.tariefTypeId!,
                  herrekenPerDag: t.herrekenPerDag,
                  omschrijving: t.omschrijving
                }
              })
            }
          }
        }
      }
      else {
        return { success: false }
      }
    }
    return { success: true, factuurId: savedFactuur };
  } catch (error: any) {
    console.error('Fout bij opslaan contract:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Haalt alle facturen op inclusief de naam van de leverancier
 */
export async function getFacturen() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT 
        f.id,
        f.factuurnummer,
        f.factuur_datum AS factuurDatum,
        f.start_datum AS startDatum,
        f.eind_datum AS eindDatum,
        f.type,
        f.totaal_excl AS totaalExcl,
        f.totaal_btw AS totaalBtw,
        f.totaal_incl AS totaalIncl,
        c.leverancier
      FROM facturen f
      LEFT JOIN contracten c ON f.contract_id = c.id
      ORDER BY f.factuur_datum DESC
    `);
    return rows;
  } catch (error) {
    console.error('Fout bij ophalen facturen:', error);
    return [];
  }
}

/**
 * Verwijdert een factuur (factuurlijnen worden via ON DELETE CASCADE verwijderd)
 */
export async function verwijderFactuur(id: number) {
  try {
    await db.query('DELETE FROM facturen WHERE id = ?', [id]);
    return { success: true };
  } catch (error: any) {
    console.error('Fout bij verwijderen factuur:', error);
    return { success: false, error: error.message };
  }
}